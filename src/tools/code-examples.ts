import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ─── cURL Examples ────────────────────────────────────────────────────────────

const CURL_EXAMPLES: Record<string, string> = {
  create_payment: `curl -X POST 'https://sandbox-api.spinpay.com.br/v1/checkouts/payments' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "referenceId": "order-12345",
    "merchantOrderReference": "ORDER-12345",
    "amount": { "value": 50.00, "currency": "BRL" },
    "paymentMethod": { "type": "nupay", "authorizationType": "manually_authorized" },
    "shopper": {
      "firstName": "João",
      "lastName": "Silva",
      "document": "12345678900",
      "documentType": "CPF",
      "email": "joao@example.com",
      "phone": { "country": "55", "number": "11999999999" }
    },
    "items": [{ "id": "SKU-001", "description": "Test Product", "value": 50.00, "quantity": 1 }],
    "paymentFlow": {
      "returnUrl": "https://yoursite.com/success",
      "cancelUrl": "https://yoursite.com/cancel"
    },
    "callbackUrl": "https://yoursite.com/webhooks/nupay",
    "delayToAutoCancel": 30
  }'`,

  create_payment_tokenized: `curl -X POST 'https://sandbox-api.spinpay.com.br/v1/checkouts/payments' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "referenceId": "order-12345",
    "merchantOrderReference": "ORDER-12345",
    "amount": { "value": 50.00, "currency": "BRL" },
    "paymentMethod": { "type": "nupay", "authorizationType": "pre_authorized", "fundingSource": "credit" },
    "installments": 1,
    "shopper": {
      "firstName": "João",
      "lastName": "Silva",
      "document": "12345678900",
      "documentType": "CPF",
      "email": "joao@example.com",
      "phone": { "country": "55", "number": "11999999999" }
    },
    "items": [{ "id": "SKU-001", "description": "Test Product", "value": 50.00, "quantity": 1 }],
    "callbackUrl": "https://yoursite.com/webhooks/nupay",
    "delayToAutoCancel": 30
  }'`,

  check_status: `curl -X GET 'https://sandbox-api.spinpay.com.br/v1/checkouts/payments/YOUR_PSP_REFERENCE_ID/status' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN'`,

  create_refund: `curl -X POST 'https://sandbox-api.spinpay.com.br/v1/checkouts/payments/YOUR_PSP_REFERENCE_ID/refunds' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "transactionRefundId": "refund-uuid-here",
    "amount": { "value": 50.00, "currency": "BRL" },
    "notes": "Customer requested refund"
  }'`,

  cancel_payment: `curl -X POST 'https://sandbox-api.spinpay.com.br/v1/checkouts/payments/YOUR_PSP_REFERENCE_ID/cancel' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN'`,

  payment_conditions: `curl -X POST 'https://sandbox-api.spinpay.com.br/v2/checkouts/payment-conditions' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{ "amount": 50.00, "document": "12345678900" }'`,

  webhook_handler: `# Simulate a NuPay payment notification to test your local webhook handler

# Payment notification — send this to your webhook endpoint
curl -X POST http://localhost:3000/webhooks/nupay \\
  -H "Content-Type: application/json" \\
  -d '{
    "pspReferenceId": "test-psp-ref-001",
    "referenceId": "order-12345",
    "timestamp": "2026-01-15T10:30:00.000Z",
    "paymentMethodType": "nupay"
  }'

# Refund notification — send this to your refund webhook endpoint
curl -X POST http://localhost:3000/webhooks/nupay/refunds \\
  -H "Content-Type: application/json" \\
  -d '{
    "pspReferenceId": "test-psp-ref-001",
    "referenceId": "order-12345",
    "transactionRefundId": "test-refund-001",
    "refundId": "test-refund-id-001",
    "timestamp": "2026-01-15T11:00:00.000Z"
  }'

# IMPORTANT: These notifications do NOT contain the payment/refund status.
# Your handler must respond 200, then poll the status endpoint:
#   GET /v1/checkouts/payments/{pspReferenceId}/status`,

  full_integration: `Full integration examples are application code. Use language="nodejs", "python", or "java" for a complete working app.`,
};

// ─── Node.js Examples ─────────────────────────────────────────────────────────

const NODEJS_EXAMPLES: Record<string, string> = {
  create_payment: `// Production tip: Includes retry for 429/5xx. For all operations, see get_code_example('nodejs', 'full_integration')
const NUPAY_BASE = "https://sandbox-api.spinpay.com.br";
const HEADERS = {
  "X-Merchant-Key": "YOUR_MERCHANT_KEY",
  "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
  "Content-Type": "application/json",
};

// Retry helper: exponential backoff for 429/5xx, respects Retry-After header
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) return response; // exhausted retries
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
      console.log(\`[NuPay] Retry \${attempt + 1}/\${maxRetries} after \${delay}ms (status: \${response.status})\`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    return response; // 2xx or 4xx (don't retry client errors)
  }
}

async function createPayment(order) {
  const response = await fetchWithRetry(\`\${NUPAY_BASE}/v1/checkouts/payments\`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      referenceId: order.id,
      merchantOrderReference: order.reference,
      amount: { value: order.amount, currency: "BRL" },
      paymentMethod: { type: "nupay", authorizationType: "manually_authorized" },
      shopper: {
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        document: order.customer.cpf,
        documentType: "CPF",
        email: order.customer.email,
      },
      items: order.items.map((item) => ({
        id: item.sku,
        description: item.name,
        value: item.price,
        quantity: item.qty,
      })),
      paymentFlow: {
        returnUrl: \`https://yoursite.com/orders/\${order.id}/success\`,
        cancelUrl: \`https://yoursite.com/orders/\${order.id}/cancel\`,
      },
      callbackUrl: "https://yoursite.com/webhooks/nupay",
      delayToAutoCancel: 30,
    }),
  });

  const transactionId = response.headers.get("x-transaction-id");
  console.log(\`[NuPay] x-transaction-id: \${transactionId}\`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`NuPay error \${response.status}: \${error.message} (x-transaction-id: \${transactionId})\`);
  }

  const data = await response.json();
  // Store transactionId with payment record for support
  return { ...data, transactionId };
}`,

  create_payment_tokenized: `const NUPAY_BASE = "https://sandbox-api.spinpay.com.br";

async function createPayment(order, accessToken) {
  const headers = {
    "X-Merchant-Key": "YOUR_MERCHANT_KEY",
    "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
    "Authorization": \`Bearer \${accessToken}\`,
    "Content-Type": "application/json",
  };

  const response = await fetch(\`\${NUPAY_BASE}/v1/checkouts/payments\`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      referenceId: order.id,
      merchantOrderReference: order.reference,
      amount: { value: order.amount, currency: "BRL" },
      paymentMethod: {
        type: "nupay",
        authorizationType: "pre_authorized",
        fundingSource: "credit",
      },
      installments: 1,
      shopper: {
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        document: order.customer.cpf,
        documentType: "CPF",
        email: order.customer.email,
      },
      items: order.items.map((item) => ({
        id: item.sku,
        description: item.name,
        value: item.price,
        quantity: item.qty,
      })),
      callbackUrl: "https://yoursite.com/webhooks/nupay",
      delayToAutoCancel: 30,
    }),
  });

  const transactionId = response.headers.get("x-transaction-id");
  console.log(\`[NuPay] x-transaction-id: \${transactionId}\`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`NuPay error \${response.status}: \${error.message} (x-transaction-id: \${transactionId})\`);
  }

  const data = await response.json();
  return { ...data, transactionId };
}`,

  check_status: `const NUPAY_BASE = "https://sandbox-api.spinpay.com.br";
const HEADERS = {
  "X-Merchant-Key": "YOUR_MERCHANT_KEY",
  "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
};

async function checkPaymentStatus(pspReferenceId) {
  const response = await fetch(
    \`\${NUPAY_BASE}/v1/checkouts/payments/\${pspReferenceId}/status\`,
    { headers: HEADERS }
  );

  const transactionId = response.headers.get("x-transaction-id");
  console.log(\`[NuPay] x-transaction-id: \${transactionId}\`);

  const data = await response.json();

  switch (data.status) {
    case "COMPLETED":
      console.log("Payment completed successfully");
      break;
    case "CANCELLED":
      console.log(\`Payment cancelled: \${data.code} — \${data.message}\`);
      break;
    case "ERROR":
      console.log(\`Payment error: \${data.code} — \${data.message}\`);
      break;
    case "WAITING_PAYMENT_METHOD":
      console.log("Still waiting for customer approval");
      break;
  }

  return { ...data, transactionId };
}`,

  create_refund: `const NUPAY_BASE = "https://sandbox-api.spinpay.com.br";
const HEADERS = {
  "X-Merchant-Key": "YOUR_MERCHANT_KEY",
  "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
  "Content-Type": "application/json",
};

async function createRefund(pspReferenceId, amount, refundId) {
  const response = await fetch(
    \`\${NUPAY_BASE}/v1/checkouts/payments/\${pspReferenceId}/refunds\`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        transactionRefundId: refundId, // unique per refund for idempotency
        amount: { value: amount, currency: "BRL" },
      }),
    }
  );

  const transactionId = response.headers.get("x-transaction-id");
  console.log(\`[NuPay] x-transaction-id: \${transactionId}\`);

  const data = await response.json();

  if (data.status === "ERROR" && data.error?.type === "INSUFFICIENT_FUNDS") {
    console.log("Refund failed: insufficient merchant balance. Retry later.");
  }

  return { ...data, transactionId };
}`,

  cancel_payment: `const NUPAY_BASE = "https://sandbox-api.spinpay.com.br";
const HEADERS = {
  "X-Merchant-Key": "YOUR_MERCHANT_KEY",
  "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
};

async function cancelPayment(pspReferenceId) {
  const response = await fetch(
    \`\${NUPAY_BASE}/v1/checkouts/payments/\${pspReferenceId}/cancel\`,
    { method: "POST", headers: HEADERS }
  );

  const transactionId = response.headers.get("x-transaction-id");
  console.log(\`[NuPay] x-transaction-id: \${transactionId}\`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`Cancel failed: \${error.message} (x-transaction-id: \${transactionId})\`);
  }

  return await response.json();
  // Note: cancel only works when status is WAITING_PAYMENT_METHOD
}`,

  webhook_handler: `// NOTE: This handler calls checkPaymentStatus() — get that function with:
//   get_code_example({ language: "nodejs", operation: "check_status" })
// For the complete app with all functions wired together, use:
//   get_code_example({ language: "nodejs", operation: "full_integration" })

import express from "express";

const app = express();
app.use(express.json());

// Payment notification — CRITICAL: notification does NOT contain the status
app.post("/webhooks/nupay", async (req, res) => {
  const { pspReferenceId, referenceId, timestamp } = req.body;
  console.log(\`[NuPay Webhook] Payment notification for \${pspReferenceId} at \${timestamp}\`);

  // Must poll to get actual status — notification is just a signal
  const status = await checkPaymentStatus(pspReferenceId);
  // Update your order based on status...

  res.sendStatus(200);
});

// Refund notification
app.post("/webhooks/nupay/refunds", async (req, res) => {
  const { pspReferenceId, refundId, transactionRefundId, timestamp } = req.body;
  console.log(\`[NuPay Webhook] Refund notification for \${refundId} at \${timestamp}\`);

  // Poll refund status — get this function with:
  //   get_code_example({ language: "nodejs", operation: "check_status" })
  const refundStatus = await checkRefundStatus(pspReferenceId, refundId);
  // Update your refund record...

  res.sendStatus(200);
});`,

  payment_conditions: `const NUPAY_BASE = "https://sandbox-api.spinpay.com.br";
const HEADERS = {
  "X-Merchant-Key": "YOUR_MERCHANT_KEY",
  "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
  "Content-Type": "application/json",
};

async function checkPaymentConditions(amount, customerCpf) {
  const response = await fetch(
    \`\${NUPAY_BASE}/v2/checkouts/payment-conditions\`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ amount, document: customerCpf }),
    }
  );

  const transactionId = response.headers.get("x-transaction-id");
  console.log(\`[NuPay] x-transaction-id: \${transactionId}\`);

  if (response.status === 400) {
    // NuPay not available for this customer/amount
    return { available: false };
  }

  const data = await response.json();
  return { available: true, conditions: data };
}`,

  full_integration: `// ═══════════════════════════════════════════════════════════════════════════════
// NuPay 2FA Integration — Complete Express App
// Run: node nupay-server.js
// ═══════════════════════════════════════════════════════════════════════════════

import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

// ─── Configuration ────────────────────────────────────────────────────────────
const NUPAY_BASE = "https://sandbox-api.spinpay.com.br";
const HEADERS = {
  "X-Merchant-Key": "YOUR_MERCHANT_KEY",     // ← Replace with your key
  "X-Merchant-Token": "YOUR_MERCHANT_TOKEN", // ← Replace with your token
  "Content-Type": "application/json",
};

// ─── NuPay API Client ─────────────────────────────────────────────────────────

async function nupayRequest(method, path, body, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(\`\${NUPAY_BASE}\${path}\`, {
      method,
      headers: body ? HEADERS : { "X-Merchant-Key": HEADERS["X-Merchant-Key"], "X-Merchant-Token": HEADERS["X-Merchant-Token"] },
      body: body ? JSON.stringify(body) : undefined,
    });
    const transactionId = response.headers.get("x-transaction-id");
    console.log(\`[NuPay] \${method} \${path} → \${response.status} (x-transaction-id: \${transactionId}, attempt: \${attempt})\`);

    // Retry on 429 (rate limit) and 5xx (server errors)
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      const retryAfter = response.headers.get("retry-after");
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
      console.log(\`[NuPay] Retrying in \${delay}ms...\`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    const data = await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, data, transactionId };
  }
}

// ─── Create Payment ───────────────────────────────────────────────────────────

app.post("/api/payments", async (req, res) => {
  const { amount, customer, items, returnUrl, cancelUrl } = req.body;
  const referenceId = crypto.randomUUID();

  const result = await nupayRequest("POST", "/v1/checkouts/payments", {
    referenceId,
    merchantOrderReference: referenceId,
    amount: { value: amount, currency: "BRL" },  // Reais decimal, NOT centavos
    paymentMethod: { type: "nupay", authorizationType: "manually_authorized" },
    shopper: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      document: customer.cpf,
      documentType: "CPF",
      email: customer.email,
    },
    items: items.map((i) => ({ id: i.id, description: i.name, value: i.price, quantity: i.qty })),
    paymentFlow: { returnUrl, cancelUrl },
    callbackUrl: "https://yoursite.com/webhooks/nupay",
    delayToAutoCancel: 30,
  });

  if (!result.ok) {
    return res.status(result.status).json({ error: result.data, transactionId: result.transactionId });
  }

  // Store pspReferenceId + transactionId in your database
  res.json({ ...result.data, transactionId: result.transactionId });
});

// ─── Check Payment Status ─────────────────────────────────────────────────────

app.get("/api/payments/:pspReferenceId/status", async (req, res) => {
  const result = await nupayRequest("GET", \`/v1/checkouts/payments/\${req.params.pspReferenceId}/status\`);
  res.json(result.data);
});

// ─── Cancel Payment ───────────────────────────────────────────────────────────

app.post("/api/payments/:pspReferenceId/cancel", async (req, res) => {
  // Only works when status is WAITING_PAYMENT_METHOD
  const result = await nupayRequest("POST", \`/v1/checkouts/payments/\${req.params.pspReferenceId}/cancel\`);
  res.status(result.status).json(result.data);
});

// ─── Create Refund ────────────────────────────────────────────────────────────

app.post("/api/payments/:pspReferenceId/refunds", async (req, res) => {
  const result = await nupayRequest("POST", \`/v1/checkouts/payments/\${req.params.pspReferenceId}/refunds\`, {
    transactionRefundId: crypto.randomUUID(),  // Unique per refund for idempotency
    amount: { value: req.body.amount, currency: "BRL" },
  });
  res.status(result.status).json(result.data);
});

// ─── Webhook: Payment Notifications ───────────────────────────────────────────
// CRITICAL: Notifications do NOT contain the payment status.
// The notification is a signal to poll the status endpoint.

app.post("/webhooks/nupay", async (req, res) => {
  const { pspReferenceId, referenceId, timestamp } = req.body;
  console.log(\`[Webhook] Payment notification for \${pspReferenceId} at \${timestamp}\`);

  // Poll actual status
  const status = await nupayRequest("GET", \`/v1/checkouts/payments/\${pspReferenceId}/status\`);
  console.log(\`[Webhook] Payment \${pspReferenceId} status: \${status.data?.status}\`);
  // TODO: Update your order in the database based on status

  res.sendStatus(200);
});

// ─── Webhook: Refund Notifications ────────────────────────────────────────────

app.post("/webhooks/nupay/refunds", async (req, res) => {
  const { pspReferenceId, refundId, timestamp } = req.body;
  console.log(\`[Webhook] Refund notification for \${refundId} at \${timestamp}\`);

  // Poll actual refund status
  const status = await nupayRequest("GET", \`/v1/checkouts/payments/\${pspReferenceId}/refunds/\${refundId}\`);
  console.log(\`[Webhook] Refund \${refundId} status: \${status.data?.status}\`);
  // TODO: Update your refund record in the database

  res.sendStatus(200);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(3000, () => console.log("NuPay integration server running on http://localhost:3000"));`,
};

// ─── Python Examples ──────────────────────────────────────────────────────────

const PYTHON_EXAMPLES: Record<string, string> = {
  create_payment: `# Production tip: Includes retry for 429/5xx. For all operations, see get_code_example('python', 'full_integration')
import requests
import time
import uuid

NUPAY_BASE = "https://sandbox-api.spinpay.com.br"
HEADERS = {
    "X-Merchant-Key": "YOUR_MERCHANT_KEY",
    "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
    "Content-Type": "application/json",
}

def nupay_request(method, path, json=None, max_retries=3):
    """Make a NuPay API call with retry for 429/5xx and Retry-After support."""
    url = f"{NUPAY_BASE}{path}"
    for attempt in range(max_retries + 1):
        response = requests.request(method, url, headers=HEADERS, json=json)
        if response.status_code == 429 or response.status_code >= 500:
            if attempt == max_retries:
                return response  # exhausted retries
            retry_after = response.headers.get("Retry-After")
            delay = int(retry_after) if retry_after else 2 ** attempt
            print(f"[NuPay] Retry {attempt + 1}/{max_retries} after {delay}s (status: {response.status_code})")
            time.sleep(delay)
            continue
        return response  # 2xx or 4xx (don't retry client errors)

def create_payment(order):
    response = nupay_request("POST", "/v1/checkouts/payments", json={
        "referenceId": str(order["id"]),
        "merchantOrderReference": order["reference"],
        "amount": {"value": order["amount"], "currency": "BRL"},
        "paymentMethod": {"type": "nupay", "authorizationType": "manually_authorized"},
        "shopper": {
            "firstName": order["customer"]["first_name"],
            "lastName": order["customer"]["last_name"],
            "document": order["customer"]["cpf"],
            "documentType": "CPF",
            "email": order["customer"]["email"],
        },
        "items": [
            {"id": item["sku"], "description": item["name"], "value": item["price"], "quantity": item["qty"]}
            for item in order["items"]
        ],
        "paymentFlow": {
            "returnUrl": f"https://yoursite.com/orders/{order['id']}/success",
            "cancelUrl": f"https://yoursite.com/orders/{order['id']}/cancel",
        },
        "callbackUrl": "https://yoursite.com/webhooks/nupay",
        "delayToAutoCancel": 30,
    })

    transaction_id = response.headers.get("x-transaction-id")
    print(f"[NuPay] x-transaction-id: {transaction_id}")

    response.raise_for_status()
    data = response.json()
    data["transaction_id"] = transaction_id
    return data`,

  create_payment_tokenized: `import requests

NUPAY_BASE = "https://sandbox-api.spinpay.com.br"

def create_payment(order, access_token):
    headers = {
        "X-Merchant-Key": "YOUR_MERCHANT_KEY",
        "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        f"{NUPAY_BASE}/v1/checkouts/payments",
        headers=headers,
        json={
            "referenceId": str(order["id"]),
            "merchantOrderReference": order["reference"],
            "amount": {"value": order["amount"], "currency": "BRL"},
            "paymentMethod": {
                "type": "nupay",
                "authorizationType": "pre_authorized",
                "fundingSource": "credit",
            },
            "installments": 1,
            "shopper": {
                "firstName": order["customer"]["first_name"],
                "lastName": order["customer"]["last_name"],
                "document": order["customer"]["cpf"],
                "documentType": "CPF",
                "email": order["customer"]["email"],
            },
            "items": [
                {"id": item["sku"], "description": item["name"], "value": item["price"], "quantity": item["qty"]}
                for item in order["items"]
            ],
            "callbackUrl": "https://yoursite.com/webhooks/nupay",
            "delayToAutoCancel": 30,
        },
    )

    transaction_id = response.headers.get("x-transaction-id")
    print(f"[NuPay] x-transaction-id: {transaction_id}")

    response.raise_for_status()
    data = response.json()
    data["transaction_id"] = transaction_id
    return data`,

  check_status: `import requests

NUPAY_BASE = "https://sandbox-api.spinpay.com.br"
HEADERS = {
    "X-Merchant-Key": "YOUR_MERCHANT_KEY",
    "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
}

def check_payment_status(psp_reference_id):
    response = requests.get(
        f"{NUPAY_BASE}/v1/checkouts/payments/{psp_reference_id}/status",
        headers=HEADERS,
    )
    transaction_id = response.headers.get("x-transaction-id")
    print(f"[NuPay] x-transaction-id: {transaction_id}")

    data = response.json()
    status = data["status"]

    if status == "COMPLETED":
        print("Payment completed successfully")
    elif status == "CANCELLED":
        print(f"Payment cancelled: {data.get('code')} — {data.get('message')}")
    elif status == "ERROR":
        print(f"Payment error: {data.get('code')} — {data.get('message')}")

    return data`,

  create_refund: `import requests
import uuid

NUPAY_BASE = "https://sandbox-api.spinpay.com.br"
HEADERS = {
    "X-Merchant-Key": "YOUR_MERCHANT_KEY",
    "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
    "Content-Type": "application/json",
}

def create_refund(psp_reference_id, amount, refund_id=None):
    response = requests.post(
        f"{NUPAY_BASE}/v1/checkouts/payments/{psp_reference_id}/refunds",
        headers=HEADERS,
        json={
            "transactionRefundId": refund_id or str(uuid.uuid4()),
            "amount": {"value": amount, "currency": "BRL"},
        },
    )
    transaction_id = response.headers.get("x-transaction-id")
    print(f"[NuPay] x-transaction-id: {transaction_id}")
    return response.json()`,

  cancel_payment: `import requests

NUPAY_BASE = "https://sandbox-api.spinpay.com.br"
HEADERS = {
    "X-Merchant-Key": "YOUR_MERCHANT_KEY",
    "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
}

def cancel_payment(psp_reference_id):
    response = requests.post(
        f"{NUPAY_BASE}/v1/checkouts/payments/{psp_reference_id}/cancel",
        headers=HEADERS,
    )
    transaction_id = response.headers.get("x-transaction-id")
    print(f"[NuPay] x-transaction-id: {transaction_id}")
    response.raise_for_status()
    return response.json()`,

  webhook_handler: `# NOTE: This handler calls check_payment_status() — get that function with:
#   get_code_example({ language: "python", operation: "check_status" })
# For the complete app with all functions wired together, use:
#   get_code_example({ language: "python", operation: "full_integration" })

from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/webhooks/nupay", methods=["POST"])
def payment_webhook():
    """Payment notification — does NOT contain status, must poll to get actual status."""
    data = request.json
    psp_reference_id = data["pspReferenceId"]
    print(f"[NuPay Webhook] Payment notification for {psp_reference_id}")

    # Poll actual status — notification is only a signal
    status = check_payment_status(psp_reference_id)
    # Update your order...

    return "", 200

@app.route("/webhooks/nupay/refunds", methods=["POST"])
def refund_webhook():
    """Refund notification — must poll for actual status."""
    data = request.json
    print(f"[NuPay Webhook] Refund notification for {data['refundId']}")
    return "", 200`,

  payment_conditions: `import requests

NUPAY_BASE = "https://sandbox-api.spinpay.com.br"
HEADERS = {
    "X-Merchant-Key": "YOUR_MERCHANT_KEY",
    "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",
    "Content-Type": "application/json",
}

def check_payment_conditions(amount, customer_cpf):
    response = requests.post(
        f"{NUPAY_BASE}/v2/checkouts/payment-conditions",
        headers=HEADERS,
        json={"amount": amount, "document": customer_cpf},
    )
    transaction_id = response.headers.get("x-transaction-id")
    print(f"[NuPay] x-transaction-id: {transaction_id}")

    if response.status_code == 400:
        return {"available": False}

    return {"available": True, "conditions": response.json()}`,

  full_integration: `# ═══════════════════════════════════════════════════════════════════════════════
# NuPay 2FA Integration — Complete Flask App
# Install: pip install flask requests
# Run: python nupay_server.py
# ═══════════════════════════════════════════════════════════════════════════════

import uuid
import time
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────
NUPAY_BASE = "https://sandbox-api.spinpay.com.br"
HEADERS = {
    "X-Merchant-Key": "YOUR_MERCHANT_KEY",      # ← Replace with your key
    "X-Merchant-Token": "YOUR_MERCHANT_TOKEN",   # ← Replace with your token
    "Content-Type": "application/json",
}


def nupay_request(method, path, json_body=None, retries=3):
    """Central NuPay API caller with x-transaction-id logging and retry."""
    for attempt in range(1, retries + 1):
        response = requests.request(method, f"{NUPAY_BASE}{path}", headers=HEADERS, json=json_body)
        tid = response.headers.get("x-transaction-id")
        print(f"[NuPay] {method} {path} → {response.status_code} (x-transaction-id: {tid}, attempt: {attempt})")

        # Retry on 429 (rate limit) and 5xx (server errors)
        if response.status_code in (429, 500, 502, 503, 504) and attempt < retries:
            retry_after = response.headers.get("Retry-After")
            delay = int(retry_after) if retry_after else 2 ** attempt
            print(f"[NuPay] Retrying in {delay}s...")
            time.sleep(delay)
            continue

        return response, tid
    return response, tid


# ─── Create Payment ───────────────────────────────────────────────────────────

@app.route("/api/payments", methods=["POST"])
def create_payment():
    data = request.json
    reference_id = str(uuid.uuid4())

    resp, tid = nupay_request("POST", "/v1/checkouts/payments", {
        "referenceId": reference_id,
        "merchantOrderReference": reference_id,
        "amount": {"value": data["amount"], "currency": "BRL"},  # Reais decimal, NOT centavos
        "paymentMethod": {"type": "nupay", "authorizationType": "manually_authorized"},
        "shopper": {
            "firstName": data["customer"]["first_name"],
            "lastName": data["customer"]["last_name"],
            "document": data["customer"]["cpf"],
            "documentType": "CPF",
            "email": data["customer"]["email"],
        },
        "items": [{"id": i["id"], "description": i["name"], "value": i["price"], "quantity": i["qty"]} for i in data["items"]],
        "paymentFlow": {"returnUrl": data["return_url"], "cancelUrl": data["cancel_url"]},
        "callbackUrl": "https://yoursite.com/webhooks/nupay",
        "delayToAutoCancel": 30,
    })

    result = resp.json()
    result["transaction_id"] = tid
    return jsonify(result), resp.status_code


# ─── Check Payment Status ─────────────────────────────────────────────────────

@app.route("/api/payments/<psp_ref>/status")
def payment_status(psp_ref):
    resp, _ = nupay_request("GET", f"/v1/checkouts/payments/{psp_ref}/status")
    return jsonify(resp.json())


# ─── Cancel Payment ───────────────────────────────────────────────────────────

@app.route("/api/payments/<psp_ref>/cancel", methods=["POST"])
def cancel_payment(psp_ref):
    resp, _ = nupay_request("POST", f"/v1/checkouts/payments/{psp_ref}/cancel")
    return jsonify(resp.json()), resp.status_code


# ─── Create Refund ────────────────────────────────────────────────────────────

@app.route("/api/payments/<psp_ref>/refunds", methods=["POST"])
def create_refund(psp_ref):
    resp, _ = nupay_request("POST", f"/v1/checkouts/payments/{psp_ref}/refunds", {
        "transactionRefundId": str(uuid.uuid4()),
        "amount": {"value": request.json["amount"], "currency": "BRL"},
    })
    return jsonify(resp.json()), resp.status_code


# ─── Webhook: Payment Notifications ───────────────────────────────────────────
# CRITICAL: Notifications do NOT contain the payment status.
# The notification is a signal to poll the status endpoint.

@app.route("/webhooks/nupay", methods=["POST"])
def payment_webhook():
    body = request.json
    psp_ref = body["pspReferenceId"]
    print(f"[Webhook] Payment notification for {psp_ref} at {body['timestamp']}")

    # Poll actual status
    resp, _ = nupay_request("GET", f"/v1/checkouts/payments/{psp_ref}/status")
    status = resp.json()
    print(f"[Webhook] Payment {psp_ref} status: {status.get('status')}")
    # TODO: Update your order in the database

    return "", 200


# ─── Webhook: Refund Notifications ────────────────────────────────────────────

@app.route("/webhooks/nupay/refunds", methods=["POST"])
def refund_webhook():
    body = request.json
    print(f"[Webhook] Refund notification for {body['refundId']} at {body['timestamp']}")
    # TODO: Poll refund status and update database
    return "", 200


if __name__ == "__main__":
    app.run(port=3000, debug=True)`,
};

// ─── Java Examples ────────────────────────────────────────────────────────────

const JAVA_EXAMPLES: Record<string, string> = {
  create_payment: `// Production tip: Includes retry for 429/5xx. For all operations, see get_code_example('java', 'full_integration')
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class NuPayClient {
    private static final String BASE_URL = "https://sandbox-api.spinpay.com.br";
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final int MAX_RETRIES = 3;

    // Retry helper: exponential backoff for 429/5xx, respects Retry-After header
    private static HttpResponse<String> sendWithRetry(HttpRequest request) throws Exception {
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 429 || status >= 500) {
                if (attempt == MAX_RETRIES) return response; // exhausted retries
                long delay = response.headers().firstValue("Retry-After")
                    .map(ra -> Long.parseLong(ra) * 1000)
                    .orElse((long) Math.pow(2, attempt) * 1000);
                System.out.printf("[NuPay] Retry %d/%d after %dms (status: %d)%n", attempt + 1, MAX_RETRIES, delay, status);
                Thread.sleep(delay);
                continue;
            }
            return response; // 2xx or 4xx (don't retry client errors)
        }
        throw new RuntimeException("Unreachable");
    }

    public static HttpResponse<String> createPayment(String orderJson) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/v1/checkouts/payments"))
            .header("X-Merchant-Key", "YOUR_MERCHANT_KEY")
            .header("X-Merchant-Token", "YOUR_MERCHANT_TOKEN")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(orderJson))
            .build();

        HttpResponse<String> response = sendWithRetry(request);
        String transactionId = response.headers().firstValue("x-transaction-id").orElse("N/A");
        System.out.println("[NuPay] x-transaction-id: " + transactionId);

        if (response.statusCode() != 200) {
            throw new RuntimeException("NuPay error " + response.statusCode() + ": " + response.body());
        }
        return response;
    }
}

// Example JSON body:
// {
//   "referenceId": "order-12345",
//   "merchantOrderReference": "ORDER-12345",
//   "amount": { "value": 50.00, "currency": "BRL" },
//   "paymentMethod": { "type": "nupay", "authorizationType": "manually_authorized" },
//   "shopper": { "firstName": "João", "lastName": "Silva", "document": "12345678900", "documentType": "CPF", "email": "joao@example.com" },
//   "items": [{ "id": "SKU-001", "description": "Test Product", "value": 50.00, "quantity": 1 }],
//   "paymentFlow": { "returnUrl": "https://yoursite.com/success", "cancelUrl": "https://yoursite.com/cancel" },
//   "callbackUrl": "https://yoursite.com/webhooks/nupay",
//   "delayToAutoCancel": 30
// }`,

  create_payment_tokenized: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class NuPayTokenizedClient {
    private static final String BASE_URL = "https://sandbox-api.spinpay.com.br";
    private static final HttpClient client = HttpClient.newHttpClient();

    public static HttpResponse<String> createPayment(String orderJson, String accessToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/v1/checkouts/payments"))
            .header("X-Merchant-Key", "YOUR_MERCHANT_KEY")
            .header("X-Merchant-Token", "YOUR_MERCHANT_TOKEN")
            .header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(orderJson))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        String transactionId = response.headers().firstValue("x-transaction-id").orElse("N/A");
        System.out.println("[NuPay] x-transaction-id: " + transactionId);

        if (response.statusCode() != 200) {
            throw new RuntimeException("NuPay error " + response.statusCode() + ": " + response.body());
        }
        return response;
    }
}

// Tokenized JSON body (pre_authorized flow):
// {
//   "referenceId": "order-12345",
//   "amount": { "value": 50.00, "currency": "BRL" },
//   "paymentMethod": { "type": "nupay", "authorizationType": "pre_authorized", "fundingSource": "credit" },
//   "installments": 1,
//   "shopper": { "firstName": "João", "lastName": "Silva", "document": "12345678900", "documentType": "CPF", "email": "joao@example.com" },
//   "items": [{ "id": "SKU-001", "description": "Test Product", "value": 50.00, "quantity": 1 }],
//   "callbackUrl": "https://yoursite.com/webhooks/nupay",
//   "delayToAutoCancel": 30
// }`,

  check_status: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class NuPayClient {
    private static final String BASE_URL = "https://sandbox-api.spinpay.com.br";
    private static final HttpClient client = HttpClient.newHttpClient();

    public static HttpResponse<String> checkPaymentStatus(String pspReferenceId) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/v1/checkouts/payments/" + pspReferenceId + "/status"))
            .header("X-Merchant-Key", "YOUR_MERCHANT_KEY")
            .header("X-Merchant-Token", "YOUR_MERCHANT_TOKEN")
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        String transactionId = response.headers().firstValue("x-transaction-id").orElse("N/A");
        System.out.println("[NuPay] x-transaction-id: " + transactionId);
        return response;
    }
}`,

  create_refund: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class NuPayClient {
    private static final String BASE_URL = "https://sandbox-api.spinpay.com.br";
    private static final HttpClient client = HttpClient.newHttpClient();

    public static HttpResponse<String> createRefund(String pspReferenceId, double amount, String refundId) throws Exception {
        String json = String.format(
            "{\\"transactionRefundId\\":\\"%s\\",\\"amount\\":{\\"value\\":%.2f,\\"currency\\":\\"BRL\\"}}",
            refundId, amount
        );
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/v1/checkouts/payments/" + pspReferenceId + "/refunds"))
            .header("X-Merchant-Key", "YOUR_MERCHANT_KEY")
            .header("X-Merchant-Token", "YOUR_MERCHANT_TOKEN")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        String transactionId = response.headers().firstValue("x-transaction-id").orElse("N/A");
        System.out.println("[NuPay] x-transaction-id: " + transactionId);
        return response;
    }
}`,

  cancel_payment: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class NuPayClient {
    private static final String BASE_URL = "https://sandbox-api.spinpay.com.br";
    private static final HttpClient client = HttpClient.newHttpClient();

    public static HttpResponse<String> cancelPayment(String pspReferenceId) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/v1/checkouts/payments/" + pspReferenceId + "/cancel"))
            .header("X-Merchant-Key", "YOUR_MERCHANT_KEY")
            .header("X-Merchant-Token", "YOUR_MERCHANT_TOKEN")
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("[NuPay] x-transaction-id: " + response.headers().firstValue("x-transaction-id").orElse("N/A"));
        return response;
    }
}`,

  webhook_handler: `// NOTE: This handler needs checkPaymentStatus() — get it with:
//   get_code_example({ language: "java", operation: "check_status" })
// For the complete app with all functions wired together, use:
//   get_code_example({ language: "java", operation: "full_integration" })

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/webhooks/nupay")
public class NuPayWebhookController {

    @PostMapping
    public void paymentNotification(@RequestBody Map<String, Object> body) {
        String pspReferenceId = (String) body.get("pspReferenceId");
        System.out.println("[NuPay Webhook] Payment notification for " + pspReferenceId);
        // CRITICAL: Notification does NOT contain payment status
        // You MUST poll GET /v1/checkouts/payments/{pspReferenceId}/status to get the actual status
    }

    @PostMapping("/refunds")
    public void refundNotification(@RequestBody Map<String, Object> body) {
        String refundId = (String) body.get("refundId");
        System.out.println("[NuPay Webhook] Refund notification for " + refundId);
        // Poll GET /v1/checkouts/payments/{pspReferenceId}/refunds/{refundId} for actual status
    }
}`,

  payment_conditions: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class NuPayClient {
    private static final String BASE_URL = "https://sandbox-api.spinpay.com.br";
    private static final HttpClient client = HttpClient.newHttpClient();

    public static HttpResponse<String> checkPaymentConditions(double amount, String cpf) throws Exception {
        String json = String.format("{\\"amount\\":%.2f,\\"document\\":\\"%s\\"}", amount, cpf);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/v2/checkouts/payment-conditions"))
            .header("X-Merchant-Key", "YOUR_MERCHANT_KEY")
            .header("X-Merchant-Token", "YOUR_MERCHANT_TOKEN")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("[NuPay] x-transaction-id: " + response.headers().firstValue("x-transaction-id").orElse("N/A"));
        return response;
        // 400 = NuPay not available for this customer/amount
    }
}`,

  full_integration: `// ═══════════════════════════════════════════════════════════════════════════════
// NuPay 2FA Integration — Complete Spring Boot Controller
// Add to your Spring Boot application
// ═══════════════════════════════════════════════════════════════════════════════

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;

@RestController
public class NuPayController {

    private static final String BASE_URL = "https://sandbox-api.spinpay.com.br";
    private static final String MERCHANT_KEY = "YOUR_MERCHANT_KEY";     // ← Replace
    private static final String MERCHANT_TOKEN = "YOUR_MERCHANT_TOKEN"; // ← Replace
    private static final HttpClient client = HttpClient.newHttpClient();

    // ─── Central API caller with x-transaction-id logging ─────────────────────

    private HttpResponse<String> nupayRequest(String method, String path, String body) throws Exception {
        var builder = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + path))
            .header("X-Merchant-Key", MERCHANT_KEY)
            .header("X-Merchant-Token", MERCHANT_TOKEN)
            .header("Content-Type", "application/json");

        HttpRequest request = "GET".equals(method)
            ? builder.GET().build()
            : builder.method(method, body != null
                ? HttpRequest.BodyPublishers.ofString(body)
                : HttpRequest.BodyPublishers.noBody()).build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        String tid = response.headers().firstValue("x-transaction-id").orElse("N/A");
        System.out.printf("[NuPay] %s %s → %d (x-transaction-id: %s)%n", method, path, response.statusCode(), tid);
        return response;
    }

    // ─── Create Payment ───────────────────────────────────────────────────────

    @PostMapping("/api/payments")
    public ResponseEntity<String> createPayment(@RequestBody Map<String, Object> order) throws Exception {
        String refId = UUID.randomUUID().toString();
        // Build JSON — amounts in reais decimal, NOT centavos
        String json = String.format("""
            {
              "referenceId": "%s",
              "merchantOrderReference": "%s",
              "amount": { "value": %s, "currency": "BRL" },
              "paymentMethod": { "type": "nupay", "authorizationType": "manually_authorized" },
              "shopper": { "firstName": "%s", "lastName": "%s", "document": "%s", "documentType": "CPF", "email": "%s" },
              "items": [{ "id": "1", "description": "Order", "value": %s, "quantity": 1 }],
              "paymentFlow": { "returnUrl": "%s", "cancelUrl": "%s" },
              "callbackUrl": "https://yoursite.com/webhooks/nupay",
              "delayToAutoCancel": 30
            }""", refId, refId, order.get("amount"),
            order.get("firstName"), order.get("lastName"), order.get("document"), order.get("email"),
            order.get("amount"), order.get("returnUrl"), order.get("cancelUrl"));

        HttpResponse<String> resp = nupayRequest("POST", "/v1/checkouts/payments", json);
        return ResponseEntity.status(resp.statusCode()).body(resp.body());
    }

    // ─── Check Status ─────────────────────────────────────────────────────────

    @GetMapping("/api/payments/{pspRefId}/status")
    public ResponseEntity<String> paymentStatus(@PathVariable String pspRefId) throws Exception {
        HttpResponse<String> resp = nupayRequest("GET", "/v1/checkouts/payments/" + pspRefId + "/status", null);
        return ResponseEntity.ok(resp.body());
    }

    // ─── Cancel Payment ───────────────────────────────────────────────────────

    @PostMapping("/api/payments/{pspRefId}/cancel")
    public ResponseEntity<String> cancelPayment(@PathVariable String pspRefId) throws Exception {
        HttpResponse<String> resp = nupayRequest("POST", "/v1/checkouts/payments/" + pspRefId + "/cancel", null);
        return ResponseEntity.status(resp.statusCode()).body(resp.body());
    }

    // ─── Create Refund ────────────────────────────────────────────────────────

    @PostMapping("/api/payments/{pspRefId}/refunds")
    public ResponseEntity<String> createRefund(@PathVariable String pspRefId, @RequestBody Map<String, Object> body) throws Exception {
        String json = String.format("""
            { "transactionRefundId": "%s", "amount": { "value": %s, "currency": "BRL" } }
            """, UUID.randomUUID(), body.get("amount"));
        HttpResponse<String> resp = nupayRequest("POST", "/v1/checkouts/payments/" + pspRefId + "/refunds", json);
        return ResponseEntity.status(resp.statusCode()).body(resp.body());
    }

    // ─── Webhook: Payment Notifications ───────────────────────────────────────
    // CRITICAL: Notifications do NOT contain the payment status.
    // The notification is a signal to poll the status endpoint.

    @PostMapping("/webhooks/nupay")
    public void paymentWebhook(@RequestBody Map<String, Object> body) throws Exception {
        String pspRefId = (String) body.get("pspReferenceId");
        System.out.println("[Webhook] Payment notification for " + pspRefId);
        // Poll actual status
        HttpResponse<String> resp = nupayRequest("GET", "/v1/checkouts/payments/" + pspRefId + "/status", null);
        System.out.println("[Webhook] Status: " + resp.body());
        // TODO: Update order in database
    }

    // ─── Webhook: Refund Notifications ────────────────────────────────────────

    @PostMapping("/webhooks/nupay/refunds")
    public void refundWebhook(@RequestBody Map<String, Object> body) throws Exception {
        System.out.println("[Webhook] Refund notification for " + body.get("refundId"));
        // TODO: Poll refund status and update database
    }
}`,
};

// ─── Lookup map ───────────────────────────────────────────────────────────────

const ALL_EXAMPLES: Record<string, Record<string, string>> = {
  curl: CURL_EXAMPLES,
  nodejs: NODEJS_EXAMPLES,
  python: PYTHON_EXAMPLES,
  java: JAVA_EXAMPLES,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCodeExample(language: string, operation: string, flow: string): string {
  const lang = language.toLowerCase();
  const langExamples = ALL_EXAMPLES[lang];
  if (!langExamples) {
    return `Unsupported language "${language}". Supported: nodejs, python, java, curl.`;
  }

  let key = operation.toLowerCase();
  if (key === "create_payment" && flow === "tokenized") {
    key = "create_payment_tokenized";
  }

  const example = langExamples[key];
  if (!example) {
    return `No example found for operation "${operation}" in ${language}. Supported: create_payment, check_status, create_refund, cancel_payment, webhook_handler, payment_conditions, full_integration.`;
  }

  const fenceLanguage = lang === "curl" ? "bash" : lang === "nodejs" ? "javascript" : lang;
  return `# ${operation} — ${language}\n\n\`\`\`${fenceLanguage}\n${example}\n\`\`\``;
}

// ─── Tool Registration ────────────────────────────────────────────────────────

export function registerCodeExampleTool(server: McpServer): void {
  server.tool(
    "get_code_example",
    "Get a ready-to-use code example for a specific NuPay API operation. Returns complete, runnable code with proper error handling, x-transaction-id logging, and retry logic. Supports Node.js, Python, Java, and cURL.",
    {
      language: z.string().describe('Programming language: "nodejs", "python", "java", or "curl"'),
      operation: z
        .string()
        .describe(
          'API operation: "create_payment", "check_status", "create_refund", "cancel_payment", "webhook_handler", "payment_conditions", or "full_integration"'
        ),
      flow: z
        .string()
        .optional()
        .describe('Payment flow: "2fa" (default) or "tokenized". Affects auth headers and payment method fields.'),
    },
    async ({ language, operation, flow }) => ({
      content: [{ type: "text" as const, text: getCodeExample(language, operation, flow ?? "2fa") }],
    })
  );
}
