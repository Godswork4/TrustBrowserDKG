import { GoogleGenAI, Type } from "@google/genai";
import { DKGResponseData, ChatMessage, TruthSignals, TruthScoreResult } from "../types";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

const dkgPreferred = (import.meta.env.VITE_DKG_HOSTNAME || import.meta.env.VITE_DKG_NODE_URL || "").replace(/\/$/, "");
const userPreferredOverride = "https://ping-framework-motorcycles-incl.trycloudflare.com";
const dkgFallbacks = [
  "https://v6-pegasus-node-02.origin-trail.network",
  "https://v6-pegasus-node-03.origin-trail.network"
];
const dkgPort = import.meta.env.VITE_DKG_PORT || (dkgPreferred.includes('trycloudflare.com') ? "443" : "8900");
const dkgApiVersionCandidates = [
  String(import.meta.env.VITE_DKG_API_VERSION || "/api/v1"),
  "/v1"
];
const useProxy = String(import.meta.env.VITE_DKG_USE_PROXY || "false").toLowerCase() === "true";
const proxyPrefix = "/api";

function candidateBases(): string[] {
  const list: string[] = [];
  const pref = (dkgPreferred || userPreferredOverride).replace(/\/$/, "");
  if (pref) list.push(pref);
  if (useProxy) list.push("");
  for (const f of dkgFallbacks) list.push(f.replace(/\/$/, ""));
  return list;
}

function composeExplorerBase(): string | null {
  const base = dkgPreferred || dkgFallbacks[0];
  return base ? base.replace(/\/$/, "") : null;
}

async function dkgPost(path: string, body: any): Promise<Response | null> {
  const bases = candidateBases();
  for (const base of bases) {
    for (const apiV of dkgApiVersionCandidates) {
      const url = `${base === "" ? `${proxyPrefix}${apiV}` : `${base}${dkgPort ? `:${dkgPort}` : ""}${apiV}`}${path}`;
      try {
        const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (resp.ok) return resp;
      } catch {}
    }
  }
  return null;
}

async function dkgGet(path: string): Promise<Response | null> {
  const bases = candidateBases();
  for (const base of bases) {
    for (const apiV of dkgApiVersionCandidates) {
      const url = `${base === "" ? `${proxyPrefix}${apiV}` : `${base}${dkgPort ? `:${dkgPort}` : ""}${apiV}`}${path}`;
      try {
        const resp = await fetch(url);
        if (resp.ok) return resp;
      } catch {}
    }
  }
  return null;
}

const dkgV7Primary = "https://ping-framework-motorcycles-incl.trycloudflare.com";
const dkgV7Public = "https://testnetv7.origintrail.io";

async function dkgV7Post(path: string, body: any): Promise<Response | null> {
  const bases = [dkgV7Primary, dkgV7Public];
  for (const b of bases) {
    const base = b.replace(/\/$/, "");
    const url = useProxy ? `${b === dkgV7Primary ? '/v7' : '/v7pub'}${path}` : `${base}${path}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) return resp;
    } catch {}
  }
  return null;
}

export const queryDKGNode = async (query: string): Promise<DKGResponseData> => {
  try {
    const v7Promise = dkgV7Post(`/query`, { query });
    const v6Promise = dkgPost(`/search`, { query, page: 1, size: 10 });
    const firstResp = await Promise.race([v7Promise, v6Promise].map(p => p.catch(() => null)));
    let searchResp = firstResp || await dkgPost(`/search`, { query, page: 1, size: 10 });
    if (firstResp === await v7Promise && firstResp) {
      const j = await firstResp.json();
      const item = Array.isArray(j?.results) ? j.results[0] : j?.results;
      if (item) {
        const title = String(item?.title || item?.name || query);
        const explanation = String(item?.description || item?.text || "");
        const ual = String(item?.ual || item?.asset?.ual || "");
        const explorerUrl = ual ? `${dkgV7Public}/explore?ual=${encodeURIComponent(ual)}` : undefined;
        return { title, explanation, sourceHash: String(item?.id || "0x"), sourceType: 'dkg', ual, explorerUrl };
      }
    }
    if (!searchResp) searchResp = await dkgPost(`/assets/search`, { query, page: 1, size: 10 });
    if (!searchResp) searchResp = await dkgPost(`/graph/search`, { query, page: 1, size: 10 });
    if (searchResp) {
      const json = await searchResp.json();
      const first = Array.isArray(json?.data) ? json.data[0] : json?.data;
      if (first) {
        const title = String(first?.title || first?.headline || query);
        const explanation = String(first?.description || first?.articleBody || "");
        const ual = String(first?.ual || first?.asset?.ual || "");
        const base = composeExplorerBase();
        const explorerUrl = ual && base ? `${base}/graph/explorer?ual=${encodeURIComponent(ual)}` : undefined;
        return { title, explanation, sourceHash: String(first?.id || "0x"), sourceType: 'dkg', ual, explorerUrl };
      }
    }
    const sparql = `SELECT DISTINCT ?headline ?articleBody ?ual WHERE { GRAPH ?ual { ?s a <http://schema.org/CreativeWork> . ?s <http://schema.org/headline> ?headline . OPTIONAL { ?s <http://schema.org/articleBody> ?articleBody } FILTER(CONTAINS(LCASE(?headline), LCASE("${query}"))) } } LIMIT 5`;
    const resp = await dkgPost(`/graph/query`, { query: sparql, operation: "SELECT" });
    if (resp) {
      const resJson = await resp.json();
      const first = resJson?.data?.[0];
      if (first) {
        const title = String(first.headline || query);
        const explanation = String(first.articleBody || "");
        const sourceHash = String(first.id || first["@id"] || "0x");
        const ual = String(first.ual || "");
        const base = composeExplorerBase();
        const explorerUrl = ual && base ? `${base}/graph/explorer?ual=${encodeURIComponent(ual)}` : undefined;
        return { title, explanation, sourceHash, sourceType: 'dkg', ual, explorerUrl };
      }
    }
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a DKG Node assistant. The user is querying: "${query}". Provide a concise explanation and a placeholder 0x hash. Return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              sourceHash: { type: Type.STRING }
            },
            required: ["title", "explanation", "sourceHash"]
          }
        }
      });
      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      const parsed = JSON.parse(text) as DKGResponseData;
      return { ...parsed, sourceType: 'ai' };
    }
  } catch (error) {
    return {
      title: "Connection Error",
      explanation: "Unable to verify the knowledge asset at this time.",
      sourceHash: "0x0000000000000000000000000000000000000000",
      sourceType: 'error'
    };
  }
};

export async function fetchLeaderboard(): Promise<Array<{ ual: string; count: number }>> {
  try {
    const endpoint = (import.meta.env.VITE_DKG_HOSTNAME || "").replace(/\/$/, "");
    const port = import.meta.env.VITE_DKG_PORT || "8900";
    const apiVersion = import.meta.env.VITE_DKG_API_VERSION || "/v1";
    if (!endpoint) return [];
    const sparql = `SELECT ?ual (COUNT(?s) as ?count) WHERE { GRAPH ?ual { ?s a <http://schema.org/SocialMediaPosting> } } GROUP BY ?ual ORDER BY DESC(?count) LIMIT 50`;
    const url = `${endpoint}${port ? `:${port}` : ""}${apiVersion}/graph/query`;
    const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: sparql, operation: "SELECT" }) });
    if (!resp.ok) return [];
    const json = await resp.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((row: any) => ({ ual: String(row.ual || row["@graph"] || ""), count: Number(row.count || 0) })).filter(x => x.ual);
  } catch {
    return [];
  }
}

export async function verifyUrl(url: string): Promise<{ verified: boolean; ual?: string; message?: string }>{
  try {
    const q = `PREFIX schema: <http://schema.org/> SELECT ?ual WHERE { GRAPH ?ual { ?s schema:url "${url}" . OPTIONAL { ?s schema:author ?author } } } LIMIT 1`;
    const resp = await dkgPost(`/graph/query`, { query: q, operation: 'SELECT' });
    if (!resp) return { verified: false, message: 'No verification record found.' };
    const json = await resp.json();
    const first = json?.data?.[0];
    const ual = String(first?.ual || '');
    if (ual) return { verified: true, ual, message: 'This site is verified on DKG.' };
    return { verified: false, message: 'No verification record found.' };
  } catch (e: any) {
    return { verified: false, message: String(e?.message || 'Verification error') };
  }
}

export async function resolvePNS(address: string): Promise<string | null> {
  try {
    const url = (import.meta.env.VITE_PNS_API || "https://api.ddns.so").replace(/\/$/, "");
    const resp = await fetch(`${url}/v1/reverse?address=${encodeURIComponent(address)}`);
    if (!resp.ok) return null;
    const json = await resp.json();
    const name = json?.name || json?.domain || null;
    return name || null;
  } catch {
    return null;
  }
}

export async function publishKnowledgeAsset(input: { title: string; explanation: string }): Promise<{ ual?: string; explorerUrl?: string }> {
  try {
    const ethV7 = (window as any).ethereum;
    if (ethV7) {
      const accounts: string[] = await ethV7.request({ method: 'eth_requestAccounts' });
      const from = accounts?.[0];
      if (from) {
        const asset = { data: { name: input.title, description: input.explanation } };
        const message = JSON.stringify(asset);
        let signature: string | null = null;
        try { signature = await ethV7.request({ method: 'personal_sign', params: [message, from] }); } catch {}
        if (!signature) { try { signature = await ethV7.request({ method: 'eth_sign', params: [from, message] }); } catch {} }
        if (signature) {
          const v7 = await dkgV7Post(`/publish`, { asset, signature, publicKey: from });
          if (v7) {
            const res = await v7.json();
            const ual: string | undefined = res?.UAL || res?.ual;
            const explorerUrl = ual ? `${dkgV7Public}/explore?ual=${encodeURIComponent(ual)}` : undefined;
            return { ual, explorerUrl };
          }
        }
      }
    }
    const preparedResp = await dkgPost(`/assets/prepare-create`, {
      content: {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: input.title,
        description: input.explanation
      },
      visibility: 'public',
      keywords: ['trustbrowser', 'origintrail']
    });
    if (!preparedResp) return {};
    const prepared = await preparedResp.json();
    const typedData = prepared?.typedData;
    if (!typedData) return {};
    const eth = (window as any).ethereum;
    if (!eth) return {};
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
    const from = accounts?.[0];
    if (!from) return {};
    const signature: string = await eth.request({ method: 'eth_signTypedData_v4', params: [from, JSON.stringify(typedData)] });
    const publishResp = await dkgPost(`/assets/create`, { typedData, signature });
    if (!publishResp) return {};
    const json = await publishResp.json();
    const ual: string | undefined = json?.ual || json?.data?.ual;
    const base = composeExplorerBase();
    const explorerUrl = ual && base ? `${base}/graph/explorer?ual=${encodeURIComponent(ual)}` : undefined;
    return { ual, explorerUrl };
  } catch {
    return {};
  }
}

export async function fetchTruthSignals(ual: string, query: string): Promise<TruthSignals> {
  try {
    const base = composeExplorerBase();
    if (!base) return { proofScore: 0, embeddingSimilarity: 0, fingerprintIntegrity: 0, publisherCommitment: 0, paranetCuration: 0, freshness: 0 };
    const sparql = `SELECT ?headline ?timestamp WHERE { GRAPH <${ual}> { ?s <http://schema.org/headline> ?headline . OPTIONAL { ?s <http://schema.org/dateModified> ?timestamp } } } LIMIT 1`;
    const resp = await dkgPost(`/graph/query`, { query: sparql, operation: 'SELECT' });
    let embeddingSimilarity = 0;
    let freshness = 0;
    if (resp) {
      const json = await resp.json();
      const row = json?.data?.[0];
      const headline = String(row?.headline || '');
      const ts = Number(Date.parse(row?.timestamp || '')) || 0;
      const now = Date.now();
      if (ts > 0) {
        const days = Math.max(1, (now - ts) / (1000 * 60 * 60 * 24));
        freshness = Math.max(0, Math.min(1, 1 / days));
      }
      const a = query.toLowerCase().split(/\s+/).filter(Boolean);
      const b = headline.toLowerCase().split(/\s+/).filter(Boolean);
      const inter = a.filter(x => b.includes(x)).length;
      const union = new Set([...a, ...b]).size || 1;
      embeddingSimilarity = inter / union;
    }
    const proofScore = await fetchProofScoreForUAL(ual);
    const fingerprintIntegrity = await fetchFingerprintIntegrity(ual);
    const publisherCommitment = 0.3;
    const paranetCuration = 0.2;
    return { proofScore, embeddingSimilarity, fingerprintIntegrity, publisherCommitment, paranetCuration, freshness };
  } catch {
    return { proofScore: 0, embeddingSimilarity: 0, fingerprintIntegrity: 0, publisherCommitment: 0, paranetCuration: 0, freshness: 0 };
  }
}

export function computeTruthScore(signals: TruthSignals): TruthScoreResult {
  const composite = (
    0.35 * signals.proofScore +
    0.25 * signals.embeddingSimilarity +
    0.15 * signals.fingerprintIntegrity +
    0.10 * signals.publisherCommitment +
    0.10 * signals.paranetCuration +
    0.05 * signals.freshness
  );
  const badges = {
    verifiedFingerprint: signals.fingerprintIntegrity >= 0.7,
    highAvailability: signals.proofScore >= 0.7,
    paranetCurated: signals.paranetCuration >= 0.5,
  };
  return { composite, badges };
}

export const streamChatResponse = async function* (history: ChatMessage[], newMessage: string) {
  try {
    if (!ai) {
      yield "No AI key provided.";
      return;
    }
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
      config: { systemInstruction: "You are TrustShield AI inside TrustBrowser." }
    });
    const result = await chat.sendMessageStream({ message: newMessage });
    for await (const chunk of result) {
      yield chunk.text;
    }
  } catch {
    yield "I'm having trouble connecting to the secure node right now.";
  }
};

export async function planDomActions(prompt: string): Promise<Array<{ type: string; query?: { text?: string; role?: string; selector?: string }; value?: string }>> {
  try {
    if (!ai) return [];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a DOM automation planner. Convert the instruction into minimal steps. Prefer role+text targeting. Return JSON { steps: [{ type: 'click'|'type'|'wait'|'navigate', query?: { text?: string, role?: string, selector?: string }, value?: string }] }. Instruction: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  query: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      role: { type: Type.STRING },
                      selector: { type: Type.STRING }
                    }
                  },
                  value: { type: Type.STRING }
                },
                required: ["type"]
              }
            }
          },
          required: ["steps"]
        }
      }
    });
    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    const steps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    return steps;
  } catch {
    return [];
  }
}

export async function summarizeText(text: string): Promise<string> {
  try {
    if (!ai) return '';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following webpage text in 6–8 bullet points with a neutral tone. Return plain markdown string.\n\n${text.slice(0, 18000)}`,
      config: { responseMimeType: 'text/plain' }
    });
    return String(response.text || '').trim();
  } catch { return ''; }
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function analyzeExifStrings(bytes: Uint8Array): { generator?: string; cameraMake?: string; cameraModel?: string } {
  try {
    const ascii = new TextDecoder('ascii').decode(bytes.slice(0, Math.min(bytes.length, 1024 * 1024)));
    const tokens = ascii.toLowerCase();
    const aiGenerators = ['stable diffusion', 'midjourney', 'dall-e', 'dalle', 'adobe firefly', 'runway', 'novelai', 'sdxl'];
    const cameras = ['canon', 'nikon', 'sony', 'apple', 'iphone', 'samsung', 'pixel'];
    const gen = aiGenerators.find(g => tokens.includes(g));
    const cam = cameras.find(c => tokens.includes(c));
    let model = '';
    const m1 = /model\0*([^\0]{3,40})/i.exec(ascii) || /Model\0*([^\0]{3,40})/i.exec(ascii);
    if (m1) model = m1[1].trim();
    return { generator: gen || undefined, cameraMake: cam || undefined, cameraModel: model || undefined };
  } catch { return {}; }
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyImageAuthenticity(file: File): Promise<{ hash: string; ual?: string; explorerUrl?: string; assessment?: string; score: number }>{
  try {
    const base = composeExplorerBase();
    const buf = await file.arrayBuffer();
    const hash = await sha256Hex(buf);
    const exif = analyzeExifStrings(new Uint8Array(buf));
    const resp = await dkgPost(`/graph/query`, {
      query: `SELECT ?ual WHERE { GRAPH ?ual { ?s ?p ?o . FILTER(STR(?o) = "${hash}") } } LIMIT 1`,
      operation: 'SELECT'
    });
    let ual: string | undefined = undefined;
    let explorerUrl: string | undefined = undefined;
    if (resp) {
      const json = await resp.json();
      const row = json?.data?.[0];
      ual = String(row?.ual || '');
      explorerUrl = ual && base ? `${base}/graph/explorer?ual=${encodeURIComponent(ual)}` : undefined;
    }
    let assessment = '';
    let aiScore = 0;
    if (ai) {
      const b64 = await fileToBase64(file);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: `Assess whether this image appears AI-generated or a deepfake. Consider EXIF hints: generator=${exif.generator||'unknown'}, cameraMake=${exif.cameraMake||'unknown'}, cameraModel=${exif.cameraModel||'unknown'}. Return JSON { verdict: string, confidence: number, notes: string }.` }] }
        ],
        config: { responseMimeType: 'application/json' }
      })
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        assessment = String(parsed?.verdict || parsed?.notes || '');
        aiScore = Number(parsed?.confidence || 0);
      }
    }
    const provenance = ual ? 0.85 : 0.15;
    if (exif.generator) aiScore = Math.max(aiScore, 0.8);
    if (exif.cameraMake || exif.cameraModel) aiScore = Math.min(aiScore, 0.5);
    const score = Math.min(1, Math.max(0, 0.5 * provenance + 0.5 * aiScore));
    return { hash, ual, explorerUrl, assessment, score };
  } catch {
    return { hash: '', score: 0 };
  }
}
async function fetchProofScoreForUAL(ual: string): Promise<number> {
  try {
    const addr = import.meta.env.VITE_RANDOMSAMPLING_ADDRESS || '';
    if (!addr) return 0;
    const { ethers } = await import('ethers');
    const eth = (window as any).ethereum;
    const provider = eth ? new ethers.BrowserProvider(eth) : null;
    if (!provider) return 0;
    const tokenIdMatch = /\/([0-9]+)$/.exec(ual);
    const tokenId = tokenIdMatch ? BigInt(tokenIdMatch[1]) : 0n;
    if (tokenId === 0n) return 0;
    const abiCandidates = [
      ["function getProofScore(uint256 tokenId) view returns (uint256)"],
      ["function proofScore(uint256 tokenId) view returns (uint256)"]
    ];
    for (const abi of abiCandidates) {
      try {
        const contract = new ethers.Contract(addr, abi, provider);
        const score: bigint = await contract.getProofScore ? await contract.getProofScore(tokenId) : await contract.proofScore(tokenId);
        const norm = Number(score) / 1e18;
        if (!Number.isNaN(norm)) return Math.max(0, Math.min(1, norm));
      } catch {}
    }
    return 0;
  } catch { return 0; }
}

async function fetchFingerprintIntegrity(ual: string): Promise<number> {
  try {
    const addr = import.meta.env.VITE_CONTENT_ASSET_STORAGE_ADDRESS || '';
    if (!addr) return 0;
    const { ethers } = await import('ethers');
    const eth = (window as any).ethereum;
    const provider = eth ? new ethers.BrowserProvider(eth) : null;
    if (!provider) return 0;
    const tokenIdMatch = /\/([0-9]+)$/.exec(ual);
    const tokenId = tokenIdMatch ? BigInt(tokenIdMatch[1]) : 0n;
    if (tokenId === 0n) return 0;
    const abi = [
      "function getAssertionIds(uint256 tokenId) view returns (bytes32[])",
      "function getAssertionIdByIndex(uint256 tokenId, uint256 index) view returns (bytes32)"
    ];
    const contract = new ethers.Contract(addr, abi, provider);
    try {
      const ids: string[] = await contract.getAssertionIds(tokenId);
      return ids && ids.length ? 1 : 0;
    } catch {
      try {
        const id: string = await contract.getAssertionIdByIndex(tokenId, 0n);
        return id && id !== ethers.ZeroHash ? 1 : 0;
      } catch { return 0; }
    }
  } catch { return 0; }
}

export async function getDKGStats(): Promise<any> {
  try {
    const resp = await dkgV7Post(`/stats`, {});
    if (resp) return await resp.json();
    return {};
  } catch { return {}; }
}

export async function getAssetsByPublisher(wallet: string): Promise<any[]> {
  try {
    const resp = await dkgV7Post(`/search`, { query: `publisher:${wallet}` });
    if (resp) {
      const j = await resp.json();
      const arr = Array.isArray(j?.results) ? j.results : [];
      return arr;
    }
    return [];
  } catch { return []; }
}