// Proxmox VE serves its API from the web UI's own host on port 8006, under /api2/json, and
// authenticates with a token sent whole in one header: PVEAPIToken=USER@REALM!TOKENID=SECRET.
export default [
  {
    id: "proxmox", name: "Proxmox VE", category: "developer",
    description: "Nodes, VMs and containers on your Proxmox VE cluster",
    website: "https://www.proxmox.com/en/proxmox-virtual-environment",
    docs: "https://pve.proxmox.com/wiki/Proxmox_VE_API",
    logo: { simpleIcons: "proxmox" },
    baseUrl: "{url}/api2/json",
    // The token carries its own user, realm and token id, so one field holds the whole value.
    auth: { type: "header", name: "Authorization", prefix: "PVEAPIToken=" },
    fields: [{ id: "token", label: "API token", secret: true,
               example: "root@pam!ci=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
               help: "Paste the token ID and secret together, exactly as shown by Proxmox: " +
                 "USER@REALM!TOKENID=SECRET." },
             { id: "url", label: "Proxmox URL", format: "url", default: "https://localhost:8006",
               help: "The address of the cluster's web UI, with its port (default 8006). It must start with " +
                 "https://, except http://localhost:8006 when Proxmox runs on this same machine, or an " +
                 "http:// address on your local network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://pve.proxmox.com/wiki/Proxmox_VE_API",
    help: "1) In Proxmox open “Datacenter” → “Permissions” → “API Tokens”. 2) Click “Create”, then pick a user, " +
      + "a realm and a token ID — the token only sees what that user may do, so use an administrator if you want " +
      + "full control. 3) Copy the secret shown once: the full value is USER@REALM!TOKENID=SECRET. 4) Paste that " +
      + "whole value here with your cluster address. If your cluster uses the default self-signed certificate, " +
      + "the first request fails until the certificate is trusted — see the note below.",
    test: {
      path: "/version",
      account: (d) => {
        const v = d?.data?.version ?? d?.version;
        const r = d?.data?.release ?? d?.release;
        return v ? `PVE ${v}${r ? ` (${r})` : ""}` : undefined;
      },
    },
    examples: "Examples: GET /version (cluster version), GET /nodes, GET /nodes/{node}/qemu (VMs), " +
      + "GET /nodes/{node}/lxc (containers), GET /nodes/{node}/qemu/{vmid}/status/current (is it running), " +
      + "POST /nodes/{node}/qemu/{vmid}/status/start, POST /nodes/{node}/qemu/{vmid}/status/stop. " +
      + "Note that a default Proxmox install serves https on a self-signed certificate, which Node rejects; " +
      + "trust the cluster certificate (or point Conector at a host that presents a trusted one) before use.",
  },
];