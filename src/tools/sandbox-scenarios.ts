import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const SCENARIOS_2FA = `# NuPay 2FA Sandbox Test Scenarios

## Base URLs
- API: \`https://sandbox-api.spinpay.com.br\`
- No authentication base needed for 2FA flow

## Test Amount Ranges

| Amount Range (BRL) | Expected Outcome | Payment Status |
|---|---|---|
| R$0.01 – R$100.00 (1 – 10000) | Debit payment — success | COMPLETED |
| R$101.00 – R$200.00 (10100 – 20000) | Credit payment — success | COMPLETED |
| R$201.00 – R$300.00 (20100 – 30000) | Credit installment with interest — success | COMPLETED |
| R$301.00 – R$702.00 (30100 – 70200) | Debit payment — success | COMPLETED |
| R$703.00 – R$803.00 (70300 – 80300) | System error | ERROR (SYSTEM_ERROR) |
| R$804.00 – R$904.00 (80400 – 90400) | Cancelled by Nubank | CANCELLED (CANCELLED_BY_INSTITUTION) |
| R$905.00 – R$1005.00 (90500 – 100500) | Cancelled by customer | CANCELLED (CANCELLED_BY_USER) |
| R$1006.00 – R$1106.00 (100600 – 110600) | Cancelled by timeout | CANCELLED (CANCELLED_BY_TIMEOUT) |
| > R$1106.00 (> 110600) | Debit payment — success | COMPLETED |

## Recommended Test Sequence

1. **Happy path:** Create payment with amount 5000 (R$50.00) → expect COMPLETED
2. **Credit:** Create payment with amount 15000 (R$150.00) → expect COMPLETED
3. **System error:** Create payment with amount 75000 (R$750.00) → expect ERROR
4. **Institution cancel:** Create payment with amount 85000 (R$850.00) → expect CANCELLED_BY_INSTITUTION
5. **User cancel:** Create payment with amount 95000 (R$950.00) → expect CANCELLED_BY_USER
6. **Timeout cancel:** Create payment with amount 105000 (R$1050.00) → expect CANCELLED_BY_TIMEOUT
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

| Amount Range (BRL) | Available Payment Methods |
|---|---|
| R$0.01 – R$100.00 (1 – 10000) | Debit only |
| R$101.00 – R$200.00 (10100 – 20000) | Credit only |
| R$201.00 – R$300.00 (20100 – 30000) | Debit + Credit |
| R$601.00 – R$700.00 (60100 – 70000) | credit_with_additional_limit only |
| R$701.00 – R$800.00 (70100 – 80000) | Credit + credit_with_additional_limit |
| R$801.00 – R$900.00 (80100 – 90000) | Debit + credit_with_additional_limit |
| R$901.00 – R$1000.00 (90100 – 100000) | All three (debit, credit, credit_with_additional_limit) |
| > R$10,000.00 (> 1000000) | None available |
| R$1107.00 – R$1206.00 (110700 – 120600) | Credit installments with interest |

## Test Amount Ranges — Payment Outcomes

| Amount Range (BRL) | Expected Outcome |
|---|---|
| R$0.01 – R$702.00 (1 – 70200) | Payment success (method depends on conditions above) |
| R$703.00 – R$803.00 (70300 – 80300) | System error (SYSTEM_ERROR) |
| R$804.00 – R$904.00 (80400 – 90400) | Cancelled by Nubank (CANCELLED_BY_INSTITUTION) |

## Recommended Test Sequence

1. **Authorize:** Use CPF \`58188896454\` to get tokens via OAuth2 or CIBA
2. **Rejected auth:** Use CPF \`31457612500\` to test authorization rejection
3. **Check conditions:** Query payment conditions with amount 95000 (R$950.00) → expect all three methods
4. **Debit payment:** Amount 5000 (R$50.00) with fundingSource "debit" → COMPLETED
5. **Credit payment:** Amount 15000 (R$150.00) with fundingSource "credit" → COMPLETED
6. **Additional limit:** Amount 65000 (R$650.00) with fundingSource "credit_with_additional_limit" → COMPLETED
7. **Installments:** Amount 115000 (R$1150.00) → verify interest fields in conditions response
8. **System error:** Amount 75000 (R$750.00) → expect ERROR
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
