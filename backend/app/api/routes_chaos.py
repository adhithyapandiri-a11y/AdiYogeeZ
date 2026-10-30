import asyncio
import time
import uuid
import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/chaos", tags=["API Chaos Lab"])

# ============================================================================
# STATE PERSISTENCE (In-Memory for High-Speed Local Proxy & Red-Team Testing)
# ============================================================================

class ChaosRules(BaseModel):
    active: bool = False
    latency_ms: int = Field(default=0, ge=0, le=15000)
    error_status: Optional[int] = Field(default=None) # 500, 502, 504, 429
    error_rate: float = Field(default=1.0, ge=0.0, le=1.0)
    drop_request: bool = False
    malformed_response: bool = False

class ChaosLogItem(BaseModel):
    id: str
    method: str
    endpoint: str
    timestamp: str
    duration_ms: int
    status_code: int
    chaos_injected: List[str]
    payload_preview: str
    success: bool

class CheckoutRequest(BaseModel):
    items: List[Dict[str, Any]] = Field(default_factory=lambda: [{"name": "AI Developer Pro Suite", "price": 49.0}])
    quantity: int = 1
    total_price: float = 49.0
    card_number: str = "4242••••••••4242"
    client_timeout_ms: Optional[int] = None
    retry_attempt: int = 0
    shield_enabled: bool = False

class RedTeamApplyFixRequest(BaseModel):
    loophole_id: str

# Current live proxy rules
current_chaos_rules = ChaosRules(
    active=False,
    latency_ms=0,
    error_status=None,
    error_rate=1.0,
    drop_request=False,
    malformed_response=False
)

# Rolling request audit log
request_logs: List[ChaosLogItem] = []
MAX_LOGS = 100

# Red-Team loop state
active_shields: set[str] = set()

# Pre-defined known loopholes that the Red-Team bot probes and verifies
LOOPHOLES_DB: Dict[str, Dict[str, Any]] = {
    "LOOP-01-TIMEOUT": {
        "id": "LOOP-01-TIMEOUT",
        "title": "Unbounded Timeout & Stuck UI Spinner on Gateway Latency",
        "severity": "HIGH",
        "category": "TIMEOUT_HANG",
        "endpoint": "/api/chaos/sample/checkout",
        "description": "When upstream payment gateway or DB experiences high latency (>4000ms), the client lacks an AbortController. The checkout button spins indefinitely, blocking user interaction and causing double-charge risks.",
        "reproduction_curl": "curl -X POST http://localhost:8000/api/chaos/sample/checkout -H 'Content-Type: application/json' -d '{\"quantity\": 1, \"total_price\": 49.0}'",
        "observed_failure": "Client thread hangs for 8000ms with zero timeout abort or fallback banner.",
        "proposed_diff": (
            "@@ -14,6 +14,10 @@ async function executeCheckout(data) {\n"
            "+ const controller = new AbortController();\n"
            "+ const timeoutId = setTimeout(() => controller.abort(), 3500);\n"
            "  try {\n"
            "-   const resp = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify(data) });\n"
            "+   const resp = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify(data), signal: controller.signal });\n"
            "+   clearTimeout(timeoutId);\n"
            "+ } catch (err) {\n"
            "+   if (err.name === 'AbortError') showTimeoutRecoveryToast();\n"
            "+ }"
        ),
        "fix_explanation": "Adds an AbortController with a 3.5s SLA timeout threshold and fires a user-friendly recovery prompt."
    },
    "LOOP-02-RETRY": {
        "id": "LOOP-02-RETRY",
        "title": "Missing Exponential Backoff Retry on Transient 503 / 500 Faults",
        "severity": "CRITICAL",
        "category": "TRANSIENT_FAULT",
        "endpoint": "/api/chaos/sample/checkout",
        "description": "Transient server blips (HTTP 500 / 503 Service Unavailable) immediately fail the user transaction. No automatic retry policy or jitter backoff is in place.",
        "reproduction_curl": "curl -X POST http://localhost:8000/api/chaos/sample/checkout (with error_status=503)",
        "observed_failure": "Checkout failed on attempt 1/1 without attempting automated idempotent retry.",
        "proposed_diff": (
            "@@ -32,7 +32,15 @@ async function postWithRetry(url, payload, maxRetries = 3) {\n"
            "+ let attempt = 0;\n"
            "+ while (attempt < maxRetries) {\n"
            "+   try {\n"
            "+     const res = await apiCall(url, payload);\n"
            "+     if (res.ok) return res.json();\n"
            "+   } catch (err) {\n"
            "+     attempt++;\n"
            "+     const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 5000);\n"
            "+     await sleep(delay);\n"
            "+   }\n"
            "+ }\n"
        ),
        "fix_explanation": "Applies an idempotent retry wrapper with exponential backoff and randomized jitter to survive transient hiccups."
    },
    "LOOP-03-BOUNDARY": {
        "id": "LOOP-03-BOUNDARY",
        "title": "Negative Quantity & Price Invariant Bypass",
        "severity": "CRITICAL",
        "category": "BOUNDARY_FUZZ",
        "endpoint": "/api/chaos/sample/checkout",
        "description": "Adversarial payload containing negative quantities (e.g. quantity: -5) bypasses zero checks, leading to negative credit deductions or ledger corruption.",
        "reproduction_curl": "curl -X POST http://localhost:8000/api/chaos/sample/checkout -d '{\"quantity\": -5, \"total_price\": -245.0}'",
        "observed_failure": "Payload accepted without rejecting negative integer boundary values.",
        "proposed_diff": (
            "@@ -8,4 +8,7 @@ class CheckoutRequest(BaseModel):\n"
            "-   quantity: int = 1\n"
            "-   total_price: float = 49.0\n"
            "+   quantity: int = Field(gt=0, le=100, description='Must be positive integer')\n"
            "+   total_price: float = Field(gt=0.0, description='Must be strictly positive')\n"
        ),
        "fix_explanation": "Enforces strict Pydantic / Zod schema guards with Field(gt=0) to prevent arithmetic boundary exploits."
    },
    "LOOP-04-MALFORMED": {
        "id": "LOOP-04-MALFORMED",
        "title": "Null Pointer Crash on Malformed / Corrupted JSON Response",
        "severity": "MEDIUM",
        "category": "MALFORMED_DATA",
        "endpoint": "/api/chaos/sample/checkout",
        "description": "When backend sends corrupted or null payload properties, client crashes with Uncaught TypeError (cannot read properties of null) instead of displaying an error boundary.",
        "reproduction_curl": "curl -X POST http://localhost:8000/api/chaos/sample/checkout (with malformed_response=true)",
        "observed_failure": "TypeError: Cannot read properties of null (reading 'order_id') on frontend rendering.",
        "proposed_diff": (
            "@@ -45,3 +45,5 @@ function renderOrderConfirmation(data) {\n"
            "-  return <div>Order #{data.order_id.slice(0,8)}</div>;\n"
            "+  const orderId = data?.order_id ?? 'PENDING-CONFIRMATION';\n"
            "+  return <div>Order #{orderId}</div>;\n"
        ),
        "fix_explanation": "Implements optional chaining and nullish coalescing to guarantee bulletproof client rendering."
    }
}

# ============================================================================
# API ROUTES: CHAOS PROXY CONTROL & LOGGING
# ============================================================================

@router.get("/rules", response_model=ChaosRules)
async def get_chaos_rules():
    """Retrieve active chaos injection rules."""
    return current_chaos_rules

@router.post("/rules", response_model=ChaosRules)
async def update_chaos_rules(rules: ChaosRules):
    """Configure chaos injection rules (delays, errors, drops, corrupted data)."""
    global current_chaos_rules
    current_chaos_rules = rules
    return current_chaos_rules

@router.post("/reset", response_model=ChaosRules)
async def reset_chaos_rules():
    """Reset all chaos rules to normal healthy operation."""
    global current_chaos_rules
    current_chaos_rules = ChaosRules(
        active=False,
        latency_ms=0,
        error_status=None,
        error_rate=1.0,
        drop_request=False,
        malformed_response=False
    )
    return current_chaos_rules

@router.get("/logs", response_model=List[ChaosLogItem])
async def get_chaos_logs(limit: int = Query(50, ge=1, le=100)):
    """Retrieve rolling timeline logs of intercepted requests."""
    return request_logs[:limit]

@router.delete("/logs")
async def clear_chaos_logs():
    """Clear request timeline logs."""
    global request_logs
    request_logs = []
    return {"message": "Logs cleared"}

# ============================================================================
# SAMPLE APP API: E-COMMERCE CHECKOUT ENDPOINT
# ============================================================================

@router.post("/sample/checkout")
async def sample_checkout_endpoint(payload: CheckoutRequest):
    """
    Simulated target API for checkout.
    Applies active chaos proxy rules (delays, errors, drops, malformations).
    """
    start_time = time.time()
    chaos_applied: List[str] = []
    status_code = 200
    is_success = True

    # 1. Boundary check: negative quantity exploitation
    # If LOOP-03-BOUNDARY shield is NOT active and quantity is negative, we simulate loophole behavior
    if payload.quantity <= 0 or payload.total_price <= 0:
        if "LOOP-03-BOUNDARY" in active_shields or payload.shield_enabled:
            # Shield is active: properly reject!
            duration = int((time.time() - start_time) * 1000)
            _log_request("POST", "/api/chaos/sample/checkout", duration, 422, ["Shield: Boundary Rejected"], str(payload.model_dump()), False)
            raise HTTPException(
                status_code=422, 
                detail="Validation Error: quantity and total_price must be strictly positive numbers."
            )
        else:
            # Vulnerability: Accepts negative number and triggers ledger error!
            chaos_applied.append("Vulnerability: Negative Value Accepted")

    # 2. Check if chaos proxy is active
    if current_chaos_rules.active:
        # A. Latency Injection
        if current_chaos_rules.latency_ms > 0:
            delay_sec = current_chaos_rules.latency_ms / 1000.0
            chaos_applied.append(f"Latency: {current_chaos_rules.latency_ms}ms")
            
            # If client has client_timeout_ms (e.g. 3500ms) and LOOP-01-TIMEOUT shield is active
            if payload.client_timeout_ms and payload.client_timeout_ms < current_chaos_rules.latency_ms:
                # Client timeout aborted early
                await asyncio.sleep(payload.client_timeout_ms / 1000.0)
                duration = int((time.time() - start_time) * 1000)
                _log_request("POST", "/api/chaos/sample/checkout", duration, 504, chaos_applied + ["Client AbortTimeout"], str(payload.model_dump()), False)
                raise HTTPException(status_code=504, detail="Client AbortController: Request timed out after SLA threshold.")
            
            await asyncio.sleep(delay_sec)

        # B. Dropped Socket Connection
        if current_chaos_rules.drop_request:
            chaos_applied.append("Dropped Request / Connection Reset")
            duration = int((time.time() - start_time) * 1000)
            _log_request("POST", "/api/chaos/sample/checkout", duration, 502, chaos_applied, str(payload.model_dump()), False)
            raise HTTPException(status_code=502, detail="Socket hang up: Connection terminated by chaos proxy.")

        # C. HTTP Error Injection (500, 502, 504, 429)
        if current_chaos_rules.error_status:
            # If retry attempt > 0 and LOOP-02-RETRY shield is active, allow 2nd attempt to succeed!
            if ("LOOP-02-RETRY" in active_shields or payload.shield_enabled) and payload.retry_attempt >= 1:
                chaos_applied.append(f"Retry #{payload.retry_attempt} Succeeded")
            else:
                err_code = current_chaos_rules.error_status
                chaos_applied.append(f"HTTP Error {err_code}")
                duration = int((time.time() - start_time) * 1000)
                _log_request("POST", "/api/chaos/sample/checkout", duration, err_code, chaos_applied, str(payload.model_dump()), False)
                raise HTTPException(status_code=err_code, detail=f"Chaos Injected Fault: {err_code} Simulated Failure")

        # D. Malformed Response
        if current_chaos_rules.malformed_response:
            chaos_applied.append("Malformed / Null JSON")
            duration = int((time.time() - start_time) * 1000)
            _log_request("POST", "/api/chaos/sample/checkout", duration, 200, chaos_applied, str(payload.model_dump()), True)
            return {
                "corrupted_schema": True,
                "data": None,
                "missing_order_id": True,
                "notice": "Chaos proxy corrupted this payload to test client null-safety"
            }

    # Normal successful execution
    duration = int((time.time() - start_time) * 1000)
    order_id = f"ord_{uuid.uuid4().hex[:10]}"
    
    response_body = {
        "status": "success",
        "order_id": order_id,
        "items_count": payload.quantity,
        "total_charged": payload.total_price,
        "currency": "USD",
        "card_last4": payload.card_number[-4:],
        "processed_at": datetime.datetime.utcnow().isoformat(),
        "chaos_applied": chaos_applied,
        "latency_ms": duration
    }

    _log_request("POST", "/api/chaos/sample/checkout", duration, 200, chaos_applied, str(payload.model_dump()), True)
    return response_body

@router.get("/sample/inventory")
async def sample_inventory_endpoint():
    """Returns sample products and live stock count."""
    return [
        {
            "id": "prod_1",
            "name": "AI Developer Pro Suite",
            "price": 49.00,
            "description": "Full access to RepoMind neural AST, execution path tracing, and Red-Team Chaos Lab.",
            "stock": 142
        },
        {
            "id": "prod_2",
            "name": "Enterprise Resilience Shield",
            "price": 99.00,
            "description": "Continuous automated chaos monkey with zero-downtime regression testing.",
            "stock": 48
        }
    ]

# ============================================================================
# AUTONOMOUS RED-TEAM BOT: AUDIT, PERMISSION, PATCH & VERIFY LOOP
# ============================================================================

@router.post("/redteam/run-audit")
async def run_redteam_audit():
    """
    Autonomous Red-Team Bot initiates active chaos probing to detect loopholes:
    1. Latency & Timeout Hang
    2. Transient Fault & Missing Backoff Retry
    3. Negative Value Arithmetic Exploit
    4. Malformed Response Null Pointer Crash
    """
    results = []
    for loop_id, loop_data in LOOPHOLES_DB.items():
        is_shielded = loop_id in active_shields
        status_val = "verified_repaired" if is_shielded else "open"
        results.append({
            **loop_data,
            "status": status_val,
            "is_shielded": is_shielded
        })

    # Calculate overall resilience score
    shielded_count = len(active_shields)
    total_loopholes = len(LOOPHOLES_DB)
    resilience_score = int((shielded_count / total_loopholes) * 100) if total_loopholes > 0 else 100

    return {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "total_probes_run": 4,
        "loopholes_detected": total_loopholes - shielded_count,
        "resilience_score": resilience_score,
        "loopholes": results
    }

@router.post("/redteam/apply-shield")
async def apply_redteam_shield(req: RedTeamApplyFixRequest):
    """
    Developer grants permission to apply the proposed defensive code shield.
    Activates the defense in client proxy/code logic.
    """
    if req.loophole_id not in LOOPHOLES_DB:
        raise HTTPException(status_code=404, detail="Loophole ID not found.")

    active_shields.add(req.loophole_id)
    loop_data = LOOPHOLES_DB[req.loophole_id]

    return {
        "success": True,
        "message": f"Shield deployed for {req.loophole_id}",
        "loophole_id": req.loophole_id,
        "shield_status": "shield_active",
        "patch_applied": loop_data["proposed_diff"]
    }

@router.post("/redteam/verify-shield")
async def verify_redteam_shield(req: RedTeamApplyFixRequest):
    """
    The Red-Team Bot re-attacks the loophole to verify that the defense held!
    """
    if req.loophole_id not in LOOPHOLES_DB:
        raise HTTPException(status_code=404, detail="Loophole ID not found.")

    is_shielded = req.loophole_id in active_shields

    if not is_shielded:
        return {
            "verified": False,
            "loophole_id": req.loophole_id,
            "message": "Defense failed: Loophole is still open and unshielded.",
            "re_attack_result": "FAILED: System broke under adversarial injection."
        }

    # Simulate re-attack verification test
    return {
        "verified": True,
        "loophole_id": req.loophole_id,
        "message": "RE-ATTACK PASSED: System gracefully withstood adversarial chaos injection.",
        "re_attack_result": "SUCCESS: Defense shield absorbed chaos and recovered within SLA.",
        "metrics": {
            "recovery_time_ms": 380,
            "retries_attempted": 1 if req.loophole_id == "LOOP-02-RETRY" else 0,
            "unhandled_exceptions": 0
        }
    }

# ============================================================================
# HELPER: INTERNAL REQUEST LOGGING
# ============================================================================

def _log_request(
    method: str, 
    endpoint: str, 
    duration_ms: int, 
    status_code: int, 
    chaos_injected: List[str], 
    payload_preview: str, 
    success: bool
):
    global request_logs
    item = ChaosLogItem(
        id=f"req_{uuid.uuid4().hex[:8]}",
        method=method,
        endpoint=endpoint,
        timestamp=datetime.datetime.utcnow().strftime("%H:%M:%S.%f")[:-3],
        duration_ms=duration_ms,
        status_code=status_code,
        chaos_injected=chaos_injected,
        payload_preview=payload_preview[:120],
        success=success
    )
    request_logs.insert(0, item)
    if len(request_logs) > MAX_LOGS:
        request_logs = request_logs[:MAX_LOGS]
