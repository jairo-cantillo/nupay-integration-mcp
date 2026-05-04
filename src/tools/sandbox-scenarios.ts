import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const SCENARIOS_2FA = `# NuPay 2FA Sandbox Test Scenarios

## Base URLs
- API: \`https://sandbox-api.spinpay.com.br\`
- No authentication base needed for 2FA flow

## Test Amount Ranges

| amount.value | Expected Outcome | Payment Status |
|---|---|---|
| 0.01 – 100.00 | Debit payment — success | COMPLETED |
| 101.00 – 200.00 | Credit payment — success | COMPLETED |
| 201.00 – 300.00 | Credit installment with interest — success | COMPLETED |
| 301.00 – 702.00 | Debit payment — success | COMPLETED |
| 703.00 – 803.00 | System error | ERROR (SYSTEM_ERROR) |
| 804.00 – 904.00 | Cancelled by Nubank | CANCELLED (CANCELLED_BY_INSTITUTION) |
| 905.00 – 1005.00 | Cancelled by customer | CANCELLED (CANCELLED_BY_USER) |
| 1006.00 – 1106.00 | Cancelled by timeout | CANCELLED (CANCELLED_BY_TIMEOUT) |
| > 1106.00 | Debit payment — success | COMPLETED |

**Important:** amounts are in reais (decimal), NOT centavos. Use \`{ "value": 50.00, "currency": "BRL" }\` for R$50.00.

## Recommended Test Sequence

1. **Happy path:** Create payment with amount.value \`50.00\` → expect COMPLETED
2. **Credit:** Create payment with amount.value \`150.00\` → expect COMPLETED
3. **System error:** Create payment with amount.value \`750.00\` → expect ERROR
4. **Institution cancel:** Create payment with amount.value \`850.00\` → expect CANCELLED_BY_INSTITUTION
5. **User cancel:** Create payment with amount.value \`950.00\` → expect CANCELLED_BY_USER
6. **Timeout cancel:** Create payment with amount.value \`1050.00\` → expect CANCELLED_BY_TIMEOUT
7. **Refund:** After a COMPLETED payment, create a refund and verify REFUNDED status

## Notes
- In sandbox, \`paymentUrl\` is a placeholder — redirect testing requires production
- \`delayToAutoCancel\` works in sandbox for timeout testing
- Webhook notifications are sent in sandbox — verify your callback endpoint receives them
`;

const SCENARIOS_TOKENIZED = `# NuPay Tokenized Sandbox Test Scenarios

## Base URLs
- API: \`https://sandbox-api.spinpay.com.br\`
- Auth: \`https://sandbox-authentication.spinpay.com.br\`

## Test CPFs
| CPF | Behavior |
|---|---|
| \`58188896454\` | Approves the authorization |
| \`31457612500\` | Rejects the authorization |

## Test Amount Ranges — Payment Conditions

| amount.value | Available Payment Methods |
|---|---|
| 0.01 – 100.00 | Debit only |
| 101.00 – 200.00 | Credit only |
| 201.00 – 300.00 | Debit + Credit |
| 601.00 – 700.00 | credit_with_additional_limit only |
| 701.00 – 800.00 | Credit + credit_with_additional_limit |
| 801.00 – 900.00 | Debit + credit_with_additional_limit |
| 901.00 – 1000.00 | All three (debit, credit, credit_with_additional_limit) |
| > 10000.00 | None available |
| 1107.00 – 1206.00 | Credit installments with interest |

## Test Amount Ranges — Payment Outcomes

| amount.value | Expected Outcome |
|---|---|
| 0.01 – 702.00 | Payment success (method depends on conditions above) |
| 703.00 – 803.00 | System error (SYSTEM_ERROR) |
| 804.00 – 904.00 | Cancelled by Nubank (CANCELLED_BY_INSTITUTION) |

**Important:** amounts are in reais (decimal), NOT centavos. Use \`{ "value": 50.00, "currency": "BRL" }\` for R$50.00.

## Recommended Test Sequence

1. **Authorize:** Use CPF \`58188896454\` to get tokens via OAuth2 or CIBA
2. **Rejected auth:** Use CPF \`31457612500\` to test authorization rejection
3. **Check conditions:** Query payment conditions with amount.value \`950.00\` → expect all three methods
4. **Debit payment:** amount.value \`50.00\` with fundingSource "debit" → COMPLETED
5. **Credit payment:** amount.value \`150.00\` with fundingSource "credit" → COMPLETED
6. **Additional limit:** amount.value \`650.00\` with fundingSource "credit_with_additional_limit" → COMPLETED
7. **Installments:** amount.value \`1150.00\` → verify interest fields in conditions response
8. **System error:** amount.value \`750.00\` → expect ERROR
9. **Refund:** After COMPLETED payment, test full and partial refund
10. **Token refresh:** Use refresh_token to get new access_token, verify old one is invalidated

## Notes
- Authorization URL is valid for 24 hours
- Authorization code is valid for 10 minutes — exchange promptly
- access_token is valid for 5 minutes — generate fresh one per payment
- CIBA auth_req_id is valid for 10 minutes
`;

export function getSandboxScenarios(flow: string): string {
  const flowLower = flow.toLowerCase();
  if (flowLower === "tokenized" || flowLower === "pre_authorized" || flowLower === "preauth") {
    return SCENARIOS_TOKENIZED;
  }
  return SCENARIOS_2FA;
}

export function registerSandboxScenariosTool(server: McpServer): void {
  server.tool(
    "get_sandbox_test_scenarios",
    "Get complete sandbox test scenarios for NuPay integration testing. Returns test amount ranges with expected outcomes, test CPFs (tokenized flow), recommended test sequences, and sandbox environment URLs.",
    {
      flow: z.string().describe('Payment flow type: "2fa" for manual authorization, "tokenized" for pre-authorized/recurring'),
    },
    async ({ flow }) => ({
      content: [{ type: "text" as const, text: getSandboxScenarios(flow) }],
    })
  );
}
