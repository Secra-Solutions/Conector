// Amazon Web Services and S3-compatible storage, all signed with AWS Signature Version 4 (auth type "aws").
import { z } from "zod";
import { ensureOk } from "../define.js";

const KEYS = [{ id: "access_key_id", label: "Access key ID" }, { id: "secret_access_key", label: "Secret access key", secret: true }];
const buckets = (xml) => [...String(xml).matchAll(/<Bucket>\s*<Name>([^<]+)<\/Name>\s*<CreationDate>([^<]+)<\/CreationDate>/g)]
  .map(([, name, created]) => ({ name, created }));
const listBuckets = (service) => ({
  title: `${service}: buckets`, annotations: { readOnlyHint: true }, schema: {},
  description: `List the ${service} buckets (name and creation date).`,
  run: async (_, p) => buckets(ensureOk(await p({ path: "/" }), service)),
});

export default [
  {
    id: "aws", name: "Amazon Web Services", category: "developer", description: "Any AWS service: costs, EC2, S3, IAM, CloudWatch…",
    website: "https://aws.amazon.com", docs: "https://docs.aws.amazon.com/", logo: { favicon: "https://aws.amazon.com" },
    baseUrl: "https://sts.amazonaws.com", allowedOrigins: ["^https://[a-z0-9.-]+\\.amazonaws\\.com$"],
    auth: { type: "aws" },
    fields: [...KEYS, { id: "session_token", label: "Session token", secret: true, optional: true,
                          help: "Only for temporary credentials (STS)." }],
    keyUrl: "https://console.aws.amazon.com/iam/home#/users",
    help: "1) In the AWS console open IAM → “Users” → “Create user” (e.g. conector), without console access. 2) Grant only "
      + "the permissions needed: to audit, the managed policies “ReadOnlyAccess” or “SecurityAudit”; for costs, “ce:Get*” "
      + "(or “AWSBillingReadOnlyAccess”). 3) On the “Security credentials” tab → “Create access key” → “Application running "
      + "outside AWS”, then copy the ID and the secret (the secret is shown only once).",
    test: { path: "/", query: { Action: "GetCallerIdentity", Version: "2011-06-15" },
              account: (d) => /<Arn>([^<]+)<\/Arn>/.exec(String(d))?.[1] || d?.GetCallerIdentityResponse?.GetCallerIdentityResult?.Arn },
    examples: "Conector signs any URL https://<service>.<region>.amazonaws.com with SigV4 (query APIs return XML). "
      + "Examples: GET https://ec2.eu-west-1.amazonaws.com/?Action=DescribeInstances&Version=2016-11-15, "
      + "GET https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08, GET https://s3.eu-west-1.amazonaws.com/ (buckets), "
      + "POST https://logs.eu-west-1.amazonaws.com/ with headers {\"X-Amz-Target\": \"Logs_20140328.DescribeLogGroups\", "
      + "\"Content-Type\": \"application/x-amz-json-1.1\"} and body {}. If the service signing name cannot be deduced from the domain, "
      + "add the header x-conector-aws-service (and x-conector-aws-region).",
    tools: [
      { name: "aws_costs", title: "AWS: costs by service", annotations: { readOnlyHint: true },
        description: "AWS cost by service and period (Cost Explorer). Each Cost Explorer query costs 0.01 USD.",
        schema: { from: z.string().describe("Start, YYYY-MM-DD"), to: z.string().describe("End (exclusive), YYYY-MM-DD"),
                   granularity: z.enum(["MONTHLY", "DAILY"]).default("MONTHLY") },
        async run({ from, to, granularity }, p) {
          const d = ensureOk(await p({ method: "POST", path: "https://ce.us-east-1.amazonaws.com/",
            headers: { "X-Amz-Target": "AWSInsightsIndexService.GetCostAndUsage", "Content-Type": "application/x-amz-json-1.1" },
            body: { TimePeriod: { Start: from, End: to }, Granularity: granularity, Metrics: ["UnblendedCost"],
                      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }] } }), "AWS");
          return (d.ResultsByTime || []).flatMap((t) => (t.Groups || []).map((g) => ({ period: t.TimePeriod?.Start, service: g.Keys?.[0],
            amount: Number(g.Metrics?.UnblendedCost?.Amount || 0).toFixed(2), currency: g.Metrics?.UnblendedCost?.Unit })))
            .filter((x) => Number(x.amount) > 0);
        } },
      { name: "aws_buckets_s3", ...listBuckets("S3"),
        run: async (_, p) => buckets(ensureOk(await p({ path: "https://s3.us-east-1.amazonaws.com/" }), "S3")) },
    ],
  },
  {
    id: "cloudflarer2", name: "Cloudflare R2", category: "developer", description: "S3-compatible object storage",
    website: "https://www.cloudflare.com/developer-platform/products/r2/", docs: "https://developers.cloudflare.com/r2/api/s3/api/",
    logo: { simpleIcons: "cloudflare" },
    baseUrl: "https://{account}.r2.cloudflarestorage.com", allowedOrigins: ["https://{account}.eu.r2.cloudflarestorage.com"],
    auth: { type: "aws", service: "s3", region: "auto" },
    fields: [{ id: "account", label: "Cloudflare account ID", format: "subdomain" },
             ...KEYS],
    keyUrl: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    help: "1) In the Cloudflare dashboard open “R2 Object Storage” → “Manage R2 API Tokens” → “Create API token”. 2) Choose the "
      + "permissions (object read, or read and write) and the buckets. 3) Copy the “Access Key ID”, the “Secret Access Key” and the "
      + "account ID (it appears in the S3 URL: https://<ID>.r2.cloudflarestorage.com).",
    test: { path: "/", message: (d) => `Accessible buckets: ${buckets(d).length}` },
    examples: "S3 API: GET / (buckets), GET /{bucket}?list-type=2&prefix=… (objects), GET /{bucket}/{key} (download), "
      + "PUT /{bucket}/{key} with body_base64 (upload). Buckets in the EU jurisdiction: https://{account}.eu.r2.cloudflarestorage.com.",
    tools: [{ name: "cloudflarer2_buckets", ...listBuckets("R2") }],
  },
  {
    id: "wasabi", name: "Wasabi", category: "developer", description: "S3-compatible cloud storage",
    website: "https://wasabi.com", docs: "https://docs.wasabi.com/docs/wasabi-api", logo: { simpleIcons: "wasabi" },
    baseUrl: "https://s3.{region}.wasabisys.com",
    auth: { type: "aws", service: "s3", region: "{region}" },
    fields: [...KEYS, { id: "region", label: "Region", default: "eu-central-1", options: [["eu-central-1", "Amsterdam (eu-central-1)"],
      ["eu-central-2", "Frankfurt (eu-central-2)"], ["eu-west-1", "London (eu-west-1)"], ["eu-west-2", "Paris (eu-west-2)"],
      ["eu-south-1", "Milan (eu-south-1)"], ["us-east-1", "Virginia (us-east-1)"], ["us-west-1", "Oregon (us-west-1)"]] }],
    help: "1) In the Wasabi console open “Access Keys” → “Create New Access Key” (for the root account or, better, for a sub-user with "
      + "limited permissions). 2) Copy the key and the secret. 3) Choose the region where your buckets are.",
    test: { path: "/", message: (d) => `Accessible buckets: ${buckets(d).length}` },
    examples: "S3 API: GET / (buckets), GET /{bucket}?list-type=2&prefix=…, GET /{bucket}/{key}, PUT /{bucket}/{key} with body_base64.",
    tools: [{ name: "wasabi_buckets", ...listBuckets("Wasabi") }],
  },
  {
    id: "backblaze", name: "Backblaze B2", category: "developer", description: "B2 storage and backups (S3 API)",
    website: "https://www.backblaze.com", docs: "https://www.backblaze.com/docs/cloud-storage-s3-compatible-api", logo: { simpleIcons: "backblaze" },
    baseUrl: "https://s3.{region}.backblazeb2.com",
    auth: { type: "aws", service: "s3", region: "{region}" },
    fields: [{ id: "access_key_id", label: "keyID" }, { id: "secret_access_key", label: "applicationKey", secret: true },
             { id: "region", label: "Bucket region", default: "eu-central-003", help: "Taken from the bucket's S3 endpoint, e.g. eu-central-003" }],
    keyUrl: "https://secure.backblaze.com/app_keys.htm",
    help: "1) In Backblaze open “Application Keys” → “Add a New Application Key”: choose the buckets and the permissions. 2) Copy the “keyID” and the "
      + "“applicationKey” (it is shown only once). 3) The region appears in the bucket's “Endpoint” (s3.<region>.backblazeb2.com).",
    test: { path: "/", message: (d) => `Accessible buckets: ${buckets(d).length}` },
    examples: "S3 API: GET / (buckets), GET /{bucket}?list-type=2&prefix=…, GET /{bucket}/{key}, PUT /{bucket}/{key} with body_base64.",
    tools: [{ name: "backblaze_buckets", ...listBuckets("B2") }],
  },
];
