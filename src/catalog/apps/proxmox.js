// Proxmox VE serves its REST API on the same address as the web interface (https only, port 8006 by default; plain http
// is redirected to https) under /api2/json, and wraps every answer in {"data": …}. API tokens go in one header,
// "Authorization: PVEAPIToken=USER@REALM!TOKENID=SECRET": the web interface shows the “Token ID” and the “Secret”
// separately, so they are asked for separately and joined here. A default install uses a certificate signed by the
// cluster's own CA (/etc/pve/pve-root-ca.pem), which Node rejects ("fetch failed") until that CA is trusted with
// NODE_EXTRA_CA_CERTS or the node gets a publicly trusted certificate.
const TOKEN_ID = /^[^\s:/]+@[A-Za-z][A-Za-z0-9._-]+![A-Za-z][A-Za-z0-9._-]+$/;

export default [
  {
    id: "proxmox", name: "Proxmox VE", category: "developer",
    description: "Nodes, VMs and containers on your Proxmox VE cluster",
    website: "https://www.proxmox.com/en/products/proxmox-virtual-environment/overview",
    docs: "https://pve.proxmox.com/pve-docs/api-viewer/",
    logo: { simpleIcons: "proxmox" },
    baseUrl: "{url}/api2/json",
    auth: { type: "custom", apply: (c) => {
      const id = String(c.token_id || "").trim();
      if (!TOKEN_ID.test(id)) {
        throw new Error("Proxmox VE: the Token ID must be the full one shown with the secret, e.g. root@pam!conector");
      }
      return { headers: { Authorization: `PVEAPIToken=${id}=${String(c.secret || "").trim()}` } };
    } },
    fields: [{ id: "url", label: "Proxmox VE URL", format: "url", placeholder: "https://192.168.1.10:8006",
               example: "https://example.invalid",
               help: "The address you open the web interface at, with its port and without /api2/json (e.g. "
                 + "https://192.168.1.10:8006). Proxmox VE only answers over https: with its default certificate, use the "
                 + "node's IP address or host name, the names that certificate covers. If Conector runs in Docker, mount "
                 + "the CA file into the container and pass -e NODE_EXTRA_CA_CERTS=<its path inside the container>." },
             { id: "token_id", label: "Token ID", placeholder: "root@pam!conector", example: "root@pam!conector",
               help: "The “Token ID” shown with the secret: user, realm and token name, e.g. root@pam!conector." },
             { id: "secret", label: "Secret", secret: true, example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }],
    keyUrl: "https://pve.proxmox.com/pve-docs/chapter-pveum.html#pveum_tokens",
    help: "1) In Proxmox VE open “Datacenter” → “Permissions” → “API Tokens” and click “Add”. 2) Pick the “User” (e.g. "
      + "root@pam), type a “Token ID” (e.g. conector) and click “Add”. With “Privilege Separation” ticked (the default) "
      + "the token has no permissions, so the test passes but lists come back empty, until you grant it a role in "
      + "“Permissions” → “Add” → “API Token Permission” (path /; PVEAuditor to read, PVEVMUser to also start and stop "
      + "guests); untick it to give the token all of its user's permissions. 3) Copy the “Token ID” and the “Secret” "
      + "(shown only once) and paste them here with the node's address. 4) A default install uses a certificate from "
      + "the cluster's own CA, which Conector rejects (“fetch failed”): copy /etc/pve/pve-root-ca.pem from a node (scp, "
      + "or the node's “System” → “Certificates” → pve-root-ca.pem → “View Certificate”) and start Conector, and "
      + "“conector mcp” if your editor runs it, with the environment variable NODE_EXTRA_CA_CERTS=<path to that file> "
      + "(the .env file is read too late for it). Or give the node a trusted certificate (“Datacenter” → “ACME”, then "
      + "the node's “System” → “Certificates”) or a reverse proxy with one, and use that name.",
    test: { path: "/version", account: (d, c) => `${c.token_id} (Proxmox VE ${d.data.version})`,
            // A wrong address (a router page, another app, a proxy's catch-all) can also answer 200.
            validate: (d) => {
              if (typeof d?.data?.version !== "string" || typeof d?.data?.release !== "string") {
                throw new Error("Proxmox VE: this URL does not answer like the Proxmox VE API (use the address you open "
                  + "the web interface at, e.g. https://192.168.1.10:8006, without /api2/json)");
              }
            } },
    examples: "Every answer is wrapped in {\"data\": …}. Examples: GET /version, GET /cluster/resources?type=vm (every VM "
      + "and container with its node, status, CPU and memory), GET /nodes, GET /nodes/{node}/qemu (VMs), "
      + "GET /nodes/{node}/lxc (containers), GET /nodes/{node}/qemu/{vmid}/status/current (is it running), "
      + "POST /nodes/{node}/qemu/{vmid}/status/start, POST /nodes/{node}/qemu/{vmid}/status/shutdown {\"timeout\":60} "
      + "(clean shutdown), POST /nodes/{node}/qemu/{vmid}/status/stop (immediate, like pulling the plug); the same under "
      + "/nodes/{node}/lxc/{vmid}/status/… for containers. Start, shutdown and stop return a task ({\"data\":\"UPID:…\"}): "
      + "GET /nodes/{node}/tasks/{upid}/status tells when it has finished (status \"stopped\") and whether it worked "
      + "(exitstatus \"OK\"). GET /access/permissions lists what this token may do.",
  },
];
