import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera, Upload, Sparkles, RotateCcw, Mic, Square, Languages, RefreshCw, IndianRupee, CheckCircle2,
  Circle, ArrowLeft, ArrowRight, PartyPopper, Store, Handshake, Keyboard, ImagePlus,
} from "lucide-react";
import { Card, Button, Field, Badge, ProductImage, toast } from "../../components/ui";
import { useSession } from "../../session";
import { CRAFTS, VOICE_LANGUAGES, DEFAULT_DAILY_WAGE, inr, craftLabel } from "../../constants";
import { enhancePhoto, fileToDataUrl, stripDataUrl, toUploadJpeg, padToSquare } from "../../imageTools";
import { canRecord, startRecorder, toUploadAudio, listMics } from "../../audioTools";
import * as api from "../../api";

const STEPS = [
  { en: "Photo", hi: "फ़ोटो" },
  { en: "Voice", hi: "आवाज़" },
  { en: "Enhance", hi: "सुधार" },
  { en: "Details", hi: "विवरण" },
  { en: "Price", hi: "मूल्य" },
  { en: "Publish", hi: "प्रकाशित" },
];

const SAMPLE_PHOTOS = {
  pottery: "photo-1578749556568-bc2c40e68b61",
  weaving: "photo-1594040226829-7f251ab46d80",
  painting: "photo-1565193566173-7a0ee3dbe261",
  jewelry: "photo-1601121141461-9d6647bca1ed",
  woodwork: "photo-1611486212557-88be5ff6f941",
  embroidery: "photo-1616627561950-9f746e330187",
};

function Stepper({ step, onJump, maxReached }) {
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => (
        <li key={s.en} className={i === step ? "current" : i < step ? "done" : ""}>
          <button type="button" disabled={i > maxReached} onClick={() => onJump(i)}>
            <span className="stepper-dot">{i < step ? <CheckCircle2 size={16} /> : i + 1}</span>
            <span className="stepper-label">{s.en}<small>{s.hi}</small></span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Step 1: photo ---------------- */
function PhotoStep({ craft, setCraft, onPhoto }) {
  const fileRef = useRef();
  const camRef = useRef();
  const [drag, setDrag] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return toast("Please choose an image file", "red");
    onPhoto(await fileToDataUrl(file));
  };

  return (
    <Card className="step-card">
      <h2>Add New Product <small>नया उत्पाद जोड़ें</small></h2>
      <div className="field">
        <span className="field-label">What did you make? / आपने क्या बनाया?</span>
        <div className="chip-row">
          {CRAFTS.map((c) => (
            <button key={c.key} type="button" className={`chip ${craft === c.key ? "active" : ""}`} onClick={() => setCraft(c.key)}>
              {c.emoji} {c.en}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <span className="dropzone-icon"><Camera size={30} /></span>
        <b>Take a Photo or Upload</b>
        <small>(We will automatically enhance it) · हम फ़ोटो को अपने-आप सुधार देंगे</small>
        <div className="row-gap">
          <Button type="button" icon={Camera} onClick={() => camRef.current.click()}>Take Photo</Button>
          <Button type="button" variant="outline" icon={Upload} onClick={() => fileRef.current.click()}>Upload</Button>
        </div>
        <button type="button" className="link small" onClick={() => onPhoto(`https://images.unsplash.com/${SAMPLE_PHOTOS[craft]}?w=1000&auto=format&fit=crop&q=80`)}>
          <ImagePlus size={14} /> No photo handy? Use a sample {craftLabel(craft).toLowerCase()} photo
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files[0])} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files[0])} />
      </div>
    </Card>
  );
}

/* ---------------- Step 2: enhance ---------------- */
const TAG_LABEL = {
  focused_on_product: "Focused on your product",
  background_removed: "Background removed",
  cropped_to_product: "Cropped to product",
  lighting_fixed: "Lighting & colour corrected",
  square_marketplace_format: "1:1 marketplace format",
  cropped_to_market_format: "1:1 marketplace format",
};

function EnhanceStep({ photos, analysis, busy, craft, onUseCraft, onRetake, onNext }) {
  const tags = [...new Set((analysis?.tags?.length ? analysis.tags : ["lighting_fixed", "cropped_to_market_format"]).map((t) => TAG_LABEL[t] || t))];
  return (
    <Card className="step-card">
      <div className="card-head">
        <h2>Image Enhancement <small>फ़ोटो सुधार</small></h2>
        {analysis?.source && <Badge tone={analysis.source === "local-filter" ? "gray" : "green"}>{analysis.source === "local-filter" ? "Basic (offline)" : analysis.source}</Badge>}
      </div>
      <div className="compare">
        <figure>
          <figcaption>Original</figcaption>
          {photos?.original ? <img src={photos.original} alt="Original" /> : <div className="img-fallback shimmer" />}
        </figure>
        <figure>
          <figcaption className="green"><Sparkles size={13} /> AI Enhanced</figcaption>
          {busy || !photos?.enhanced ? (
            <div className="img-fallback shimmer"><Sparkles size={22} /> Removing background…<small>पृष्ठभूमि हटा रहे हैं</small></div>
          ) : (
            <img src={photos.enhanced} alt="AI enhanced" />
          )}
        </figure>
      </div>
      {!busy && (
        <>
          <div className="chip-row center">
            {tags.map((t) => <Badge key={t} tone="green">✓ {t}</Badge>)}
            {analysis?.lighting && <Badge tone="blue">Light: {analysis.lighting}</Badge>}
          </div>
          {analysis?.located?.label && (
            <p className="note-green"><Sparkles size={14} /> Aapki baat se dhoondha: <b>{analysis.located.label}</b> — baaki sab hata diya</p>
          )}
          {analysis?.identified && (
            <div className="note-blue identify">
              <Sparkles size={15} />
              <span className="grow">AI ne pehchana: <b>{analysis.identified}</b>{analysis.identifiedHi && <> · <span className="hi">{analysis.identifiedHi}</span></>}</span>
              {analysis.detectedCraft && analysis.detectedCraft !== craft && (
                <Button size="sm" variant="outline-blue" onClick={() => onUseCraft(analysis.detectedCraft)}>Craft: {craftLabel(analysis.detectedCraft)}?</Button>
              )}
            </div>
          )}
          {analysis?.isProductPhoto === false && <p className="form-error">This doesn&apos;t look like a product photo — please retake it with the product in the centre.</p>}
          {analysis?.artisanTip && <p className="note-green hi"><Camera size={14} /> {analysis.artisanTip}</p>}
        </>
      )}
      <div className="step-actions">
        <Button variant="outline" icon={RotateCcw} onClick={onRetake}>Retake</Button>
        <Button onClick={onNext} disabled={busy || !photos?.enhanced} icon={CheckCircle2}>Use & Generate Details</Button>
      </div>
    </Card>
  );
}

/* ---------------- Step 3: voice ---------------- */
const MAX_SECONDS = 180;
const MIC_KEY = "shilpsaathi.mic";
const readMic = () => { try { return localStorage.getItem(MIC_KEY) || ""; } catch { return ""; } };
const VOICE_OPTIONS = [{ code: "hi-en", label: "Hindi + English (mixed)" }, ...VOICE_LANGUAGES];

function VoiceStep({ craft, photo, voice, setVoice, onNext }) {
  const [lang, setLang] = useState("hi-en");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [bars, setBars] = useState(() => Array(36).fill(0.1));
  const [mics, setMics] = useState([]);
  const [micId, setMicId] = useState(readMic);
  const [micSilent, setMicSilent] = useState(false);
  const recRef = useRef(null);
  const timer = useRef(null);
  const meter = useRef(null);

  // Laptops often have several inputs (built-in, headset, "Stereo Mix"…) — let the artisan pick
  useEffect(() => { listMics().then(setMics); }, []);
  const chooseMic = (id) => {
    setMicId(id);
    setMicSilent(false);
    try { localStorage.setItem(MIC_KEY, id); } catch { /* ignore */ }
  };

  const cleanup = () => {
    clearInterval(timer.current);
    cancelAnimationFrame(meter.current);
  };
  useEffect(() => () => { cleanup(); recRef.current?.cancel(); }, []);

  const transcribe = async (audio) => {
    setProcessing(true);
    try {
      const hint = lang === "hi-en" ? "Hindi and English mixed (Hinglish)" : lang;
      const res = await api.transcribeVoice(craft, { ...audio, languageHint: hint });
      if (res.empty || !(res.transcript || res.transcriptHi)) {
        toast("Kuch sunai nahi diya — dobara bolkar dekhiye", "red");
        return;
      }
      setVoice({ transcript: res.transcript || res.transcriptHi, english: res.english || "", hindi: res.hindi || "", language: res.language, source: res.source, lang });
      if (res.source === "demo-sample") toast("AI transcription unavailable — showing a demo sample", "gray");
    } finally {
      setProcessing(false);
    }
  };

  const start = async () => {
    if (!canRecord()) return toast("This browser can't record audio — please type your description", "red");
    try {
      recRef.current = await startRecorder(micId || undefined);
    } catch (e) {
      // A saved mic that was unplugged → fall back to the default one
      if (micId && (e.name === "OverconstrainedError" || e.name === "NotFoundError")) {
        chooseMic("");
        try { recRef.current = await startRecorder(); } catch { return toast("Microphone permission denied — allow the mic or type instead", "red"); }
      } else {
        return toast("Microphone permission denied — allow the mic or type instead", "red");
      }
    }
    listMics().then(setMics); // labels become available after permission
    setSeconds(0);
    setMicSilent(false);
    setRecording(true);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    const tick = () => {
      const l = recRef.current?.level() || 0;
      setBars((b) => [...b.slice(1), Math.max(0.08, l)]);
      meter.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stop = async () => {
    cleanup();
    setRecording(false);
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    const heard = rec.maxLevel();
    const blob = await rec.stop();
    if (seconds < 1) return toast("Recording too short — speak a little longer", "red");
    if (heard < 0.03) {
      setMicSilent(true);
      return toast("Mic se awaaz nahi aayi — neeche se sahi mic chunein aur dobara bolein", "red");
    }
    setProcessing(true);
    await transcribe(await toUploadAudio(blob));
  };

  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

  const mmss = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

  return (
    <Card className="step-card">
      <div className="voice-head">
        {photo && <img src={photo} alt="Your product" className="voice-thumb" />}
        <div>
          <h2>Describe Your Product <small>अपने उत्पाद के बारे में बताइए</small></h2>
          <p className="muted">Say what it is first (e.g. “crochet flower keychain”) — AI uses this to find your product in the photo and remove everything else. Then say the <b>material</b> (e.g. “ऊन से बना”), days of work and the story.</p>
        </div>
      </div>
      <div className="voice-box">
        <button type="button" className={`mic ${recording ? "live" : ""}`} onClick={recording ? stop : start} disabled={processing} aria-label={recording ? "Stop recording" : "Start recording"}>
          {recording ? <Square size={30} /> : <Mic size={34} />}
        </button>
        <div className="voice-meta">
          <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={recording || processing} aria-label="Voice language">
            {VOICE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <span className="timer">{mmss(seconds)}{recording && <small className="muted"> / {mmss(MAX_SECONDS)}</small>}</span>
        </div>
        <div className={`wave live-wave ${recording ? "on" : ""}`} aria-hidden="true">
          {bars.map((b, i) => <i key={i} style={{ height: `${Math.round(4 + b * 30)}px` }} />)}
        </div>
        {mics.length > 1 && (
          <label className={`mic-pick ${micSilent ? "warn" : ""}`}>
            <Mic size={14} />
            <select value={micId} onChange={(e) => chooseMic(e.target.value)} disabled={recording || processing} aria-label="Microphone">
              <option value="">Default microphone</option>
              {mics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        )}
        {micSilent && <p className="form-error">Is mic se koi awaaz nahi aayi. Doosra mic chunein, ya laptop ki sound settings mein mic ka volume / mute check karein.</p>}
        {recording && <p className="live-text">Listening… सुन रहे हैं… (bolte rahiye — lines upar-neeche hil rahi hain to mic sun raha hai)</p>}
        {processing && <p className="live-text"><Sparkles size={14} className="pulse" /> AI aapki poori baat sun raha hai… this can take up to 30 seconds</p>}
        <Button variant="blue" className="btn-wide" onClick={recording ? stop : start} loading={processing} icon={recording ? Square : Mic}>
          {processing ? "Transcribing…" : recording ? "Stop & Process" : voice ? "Record again" : "Start Speaking"}
        </Button>
      </div>

      <div className="grid-2">
        <Field label={<><Keyboard size={13} /> What we heard (edit if needed) {voice?.language && <Badge tone="blue">{voice.language}</Badge>}</>}>
          <textarea rows={4} value={voice?.transcript || ""} placeholder="Or type your description here…"
            onChange={(e) => setVoice({ ...(voice || {}), transcript: e.target.value, lang })} />
        </Field>
        <Field label={<><Languages size={13} /> English translation</>}>
          <textarea rows={4} value={voice?.english || ""} onChange={(e) => setVoice({ ...(voice || {}), english: e.target.value })} placeholder="Auto-translated after you speak" />
        </Field>
      </div>
      <div className="step-actions">
        <Button onClick={onNext} disabled={!voice?.transcript?.trim() || processing || recording} icon={Sparkles}>Enhance Photo with AI</Button>
      </div>
    </Card>
  );
}

/* ---------------- Step 4: AI details ---------------- */
function DetailsStep({ details, setDetails, busy, onRegenerate, onNext }) {
  const set = (k) => (e) => setDetails({ ...details, [k]: e.target.value });
  if (busy || !details)
    return (
      <Card className="step-card center">
        <Sparkles size={30} className="pulse green" />
        <h2>Writing your catalogue…</h2>
        <p className="muted">AI is reading your photo and voice note to create a bilingual listing.</p>
      </Card>
    );
  return (
    <Card className="step-card">
      <div className="card-head">
        <h2>Product Details <small>(AI Generated)</small></h2>
        {details.source && <Badge tone={details.source.startsWith("gemini") ? "green" : "gray"}>{details.source.startsWith("gemini") ? "Gemini AI" : "Template AI"}</Badge>}
      </div>
      <div className="form-grid">
        <Field label="Title"><input value={details.title} onChange={set("title")} /></Field>
        <Field label="Title (Hindi)"><input value={details.titleHi} onChange={set("titleHi")} className="hi" /></Field>
        <Field label="Category"><input value={details.category} onChange={set("category")} /></Field>
        <Field label="Material" hint={details.materialsSource === "photo" ? <span className="guess">⚠ Photo se andaza — aapne material nahi bataya. Sahi material likhein (jaise wool / ऊन, cotton / सूती).</span> : null}>
          <input value={details.materials} onChange={(e) => setDetails({ ...details, materials: e.target.value, materialsSource: "artisan" })} className={details.materialsSource === "photo" ? "input-guess" : ""} />
        </Field>
        <Field label="Description (Hindi)" className="span-2"><textarea rows={3} value={details.descriptionHi} onChange={set("descriptionHi")} className="hi" /></Field>
        <Field label="Description (English)" className="span-2"><textarea rows={3} value={details.description} onChange={set("description")} /></Field>
      </div>
      {details.tags?.length > 0 && (
        <div className="chip-row">{details.tags.map((t) => <Badge key={t} tone="orange">#{t}</Badge>)}</div>
      )}
      <div className="step-actions">
        <Button variant="outline" icon={RefreshCw} onClick={onRegenerate}>Regenerate</Button>
        <Button onClick={onNext} disabled={!details.title} icon={ArrowRight}>Next: Pricing</Button>
      </div>
    </Card>
  );
}

/* ---------------- Step 5: pricing ---------------- */
function PriceStep({ craft, details, pricing, setPricing, onNext }) {
  const [busy, setBusy] = useState(false);
  const { raw, days, wage, other } = pricing.inputs;
  const cost = Number(raw || 0) + Number(days || 0) * Number(wage || 0) + Number(other || 0);
  const setInput = (k) => (e) => setPricing({ ...pricing, inputs: { ...pricing.inputs, [k]: e.target.value } });

  // Market reference is looked up once per product; the backend caches it, so cost changes are cheap
  useEffect(() => {
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const s = await api.recommendPrice(cost, craft, {
          title: details?.title, description: details?.description, material: details?.materials, category: details?.category,
        });
        if (s?.recommended) setPricing((p) => ({ ...p, suggestion: s, from: s.recommended, to: s.max, cost }));
        else setPricing((p) => ({ ...p, suggestion: s }));
      } catch (e) {
        setPricing((p) => ({ ...p, suggestion: { basis: e.message } }));
      } finally {
        setBusy(false);
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cost, craft, details?.title]);

  const s = pricing.suggestion;
  const m = s?.market;
  const sourceLabel = !m ? null : m.source === "google-shopping" ? "Live · Google Shopping" : m.source === "gemini-google-search" ? "Live · Google Search" : "AI estimate · not live";
  return (
    <Card className="step-card">
      <h2>Pricing Details <small>मूल्य निर्धारण</small></h2>
      <div className="grid-2 gap-lg">
        <div className="stack">
          <p className="muted small">Enter what it cost you to make one piece — we compare it with what similar items sell for online, and never suggest a price below your cost.</p>
          <Field label="Raw Material Cost (₹)"><div className="input-prefix"><span>₹</span><input type="number" min="0" value={raw} onChange={setInput("raw")} placeholder="e.g. 80" /></div></Field>
          <div className="grid-2">
            <Field label="Labour / Days"><input type="number" min="0" step="0.5" value={days} onChange={setInput("days")} placeholder="e.g. 0.5" /></Field>
            <Field label="Daily wage (₹)"><input type="number" min="0" value={wage} onChange={setInput("wage")} /></Field>
          </div>
          <Field label="Other Expenses (₹)" hint="Packing, transport, tools"><div className="input-prefix"><span>₹</span><input type="number" min="0" value={other} onChange={setInput("other")} placeholder="e.g. 20" /></div></Field>
        </div>
        <div className="price-box">
          <span className="muted small">Suggested Price Range</span>
          <b className="price-big">{busy && !s ? "…" : s?.recommended ? `${inr(s.min)} – ${inr(s.max)}` : "—"}</b>
          <dl>
            <div><dt>Recommended price</dt><dd>{s?.recommended ? inr(s.recommended) : "—"}</dd></div>
            <div><dt>Your production cost</dt><dd>{cost ? inr(cost) : "—"}</dd></div>
            {s?.floor ? <div><dt>Your minimum (cost + 15%)</dt><dd>{inr(s.floor)}</dd></div> : null}
            {s?.recommended && cost ? <div><dt>Your profit per piece</dt><dd>{inr(Math.max(0, s.recommended - cost))}</dd></div> : null}
          </dl>
          {s?.basis && <p className="tiny muted">{s.basis}</p>}
        </div>
      </div>

      {m && (
        <div className="market-box">
          <div className="card-head">
            <b>Market reference <span className="muted small">— similar products online</span></b>
            <Badge tone={m.live ? "green" : "orange"}>{sourceLabel}</Badge>
          </div>
          <p className="small">Typical price <b>{inr(m.median)}</b> · most sell between <b>{inr(m.low)} – {inr(m.high)}</b></p>
          {m.comparables?.length > 0 && (
            <ul className="market-list">
              {m.comparables.map((c, i) => (
                <li key={i}>
                  <span className="market-site">{c.site}</span>
                  {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="grow">{c.title}</a> : <span className="grow">{c.title}</span>}
                  <b>{inr(c.price)}</b>
                </li>
              ))}
            </ul>
          )}
          {!m.live && <p className="tiny muted">These are typical prices estimated by AI, not live listings. Add a SERPAPI_KEY (or enable Gemini billing) in backend/.env for live Flipkart/Amazon prices.</p>}
          {m.sources?.length > 0 && <p className="tiny muted">Sources: {m.sources.map((x, i) => <a key={i} href={x.url} target="_blank" rel="noreferrer">{x.title || "link"}{i < m.sources.length - 1 ? ", " : ""}</a>)}</p>}
        </div>
      )}
      {s?.warning && <p className="note-blue"><Sparkles size={14} /> {s.warning}</p>}

      <div className="grid-2">
        <Field label="Your price — from (₹)" hint="You can edit the price as per your choice · आप कीमत बदल सकते हैं">
          <input type="number" min="1" value={pricing.from ?? ""} onChange={(e) => setPricing({ ...pricing, from: e.target.value })} />
        </Field>
        <Field label="Up to (₹)" hint="Shown to buyers as a range">
          <input type="number" min="1" value={pricing.to ?? ""} onChange={(e) => setPricing({ ...pricing, to: e.target.value })} />
        </Field>
      </div>
      {cost > 0 && Number(pricing.from) > 0 && Number(pricing.from) < cost && <p className="form-error">Your price is below your production cost — you would lose money on each piece.</p>}
      <div className="step-actions">
        <Button onClick={onNext} disabled={!Number(pricing.from)} icon={ArrowRight}>Review & Publish</Button>
      </div>
    </Card>
  );
}

/* ---------------- Step 6: review & publish ---------------- */
function ReviewStep({ photos, details, pricing, craft, onEdit, onPublish, publishing }) {
  const from = Number(pricing.from);
  const to = Number(pricing.to) > from ? Number(pricing.to) : null;
  const checks = [
    ["Product details verified", !!(details?.title && details?.description)],
    ["Images look good", !!photos?.enhanced],
    ["Price is set", from > 0],
    ["Ready to publish!", !!(details?.title && photos?.enhanced && from > 0)],
  ];
  return (
    <Card className="step-card">
      <h2>Review &amp; Confirm <small>जाँचें और पुष्टि करें</small></h2>
      <div className="review">
        <ProductImage src={photos?.enhanced} className="review-img" alt="" />
        <div>
          <h3>{details?.title}</h3>
          <p className="hi muted">{details?.titleHi}</p>
          <b className="price-big">{inr(from)}{to ? ` – ${inr(to)}` : ""}</b>
          <div className="chip-row">
            <Badge tone="green">{craftLabel(craft)}</Badge>
            <Badge tone="green">{details?.category}</Badge>
            <Badge tone="green">Handmade</Badge>
          </div>
          <p className="small">{details?.description}</p>
        </div>
      </div>
      <ul className="checklist">
        {checks.map(([label, ok]) => (
          <li key={label} className={ok ? "ok" : ""}>{ok ? <CheckCircle2 size={18} /> : <Circle size={18} />} {label}</li>
        ))}
      </ul>
      <div className="step-actions">
        <Button variant="outline" onClick={onEdit}>Edit</Button>
        <Button onClick={onPublish} loading={publishing} disabled={!checks[3][1]} icon={Store}>Publish Product</Button>
      </div>
    </Card>
  );
}

/* ---------------- wizard ---------------- */
export default function AddProduct() {
  const { user } = useSession("artisan");
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [craft, setCraft] = useState(user.craft || "pottery");
  const [photos, setPhotos] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [voice, setVoice] = useState(null);
  const [details, setDetails] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pricing, setPricing] = useState({ inputs: { raw: "", days: "", wage: DEFAULT_DAILY_WAGE, other: "" }, suggestion: null, from: null, to: null });
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(null);

  const go = (i) => {
    setStep(i);
    setMaxReached((m) => Math.max(m, i));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const photoRun = useRef(0);

  // Step 1 → 2: keep the photo, then ask the artisan to describe it
  const onPhoto = async (src) => {
    photoRun.current++;
    setAnalysis(null);
    try {
      const [upload, local] = await Promise.all([toUploadJpeg(src), enhancePhoto(src)]);
      setPhotos({ original: local.original, upload, localEnhanced: local.enhanced });
      go(1);
    } catch {
      toast("Could not read that photo — try another one", "red");
    }
  };

  // Step 2 → 3: enhance using the artisan's description to find the product in the photo
  const startEnhance = async () => {
    const run = ++photoRun.current;
    go(2);
    setEnhancing(true);
    setAnalysis(null);
    setPhotos((p) => ({ ...p, enhanced: null }));
    const b64 = stripDataUrl(photos.upload);
    const description = [voice?.transcript, voice?.english].filter(Boolean).join(" / ");
    try {
      // Identification runs in parallel and fills in when ready
      api.identifyProduct(craft, b64, description).then((id) => {
        if (run === photoRun.current && id && id.source !== "unavailable") setAnalysis((a) => ({ ...(a || {}), ...id, source: [a?.source, id.source].filter(Boolean).join(" + ") }));
      }).catch(() => {});
      const res = await api.enhanceImage(craft, b64, { identify: false, description });
      let enhanced = photos.localEnhanced;
      if (res.enhancedImageUrl?.startsWith("http")) enhanced = res.enhancedImageUrl;
      // remove.bg worked but Cloudinary is not set up: square it in the browser
      else if (res.enhancedImageUrl?.startsWith("data:")) enhanced = await padToSquare(res.enhancedImageUrl);
      if (run !== photoRun.current) return;
      setPhotos((p) => ({ ...p, enhanced }));
      setAnalysis((a) => ({ ...res, ...(a || {}), tags: res.tags, located: res.located, source: [res.source, a?.source].filter(Boolean).join(" + ") }));
    } catch {
      if (run === photoRun.current) setPhotos((p) => ({ ...p, enhanced: p.localEnhanced }));
    } finally {
      if (run === photoRun.current) setEnhancing(false);
    }
  };

  const generate = async () => {
    go(3);
    setGenerating(true);
    try {
      let english = voice?.english;
      if (voice?.transcript && !english) {
        english = (await api.translateText(voice.transcript, craft)).translatedText;
        if (english === voice.transcript) english = ""; // no real translation available offline
        else setVoice({ ...voice, english });
      }
      const transcript = [voice?.transcript, english && english !== voice?.transcript ? `(English: ${english})` : ""].join(" ").trim();
      const res = await api.generateCatalogue(craft, stripDataUrl(photos?.upload || photos?.original), transcript);
      if (res.craft && res.craft !== craft && CRAFTS.some((c) => c.key === res.craft)) setCraft(res.craft);
      // Keep the artisan's own words as the vernacular description when the template fallback is used
      if (res.source === "local-template" && voice?.transcript) {
        res.descriptionHi = voice.transcript;
        if (english) res.description = english;
      }
      setDetails(res);
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const from = Number(pricing.from);
      const to = Number(pricing.to) > from ? Number(pricing.to) : from;
      const prod = await api.publishProduct({
        artisanId: user.id,
        title: details.title,
        titleHi: details.titleHi,
        description: details.description,
        descriptionHi: details.descriptionHi,
        craft,
        category: details.category,
        material: details.materials,
        price: from,
        priceMin: from,
        priceMax: to,
        imageUrl: photos.enhanced,
      });
      setPublished(prod);
      toast("Product published! 🎉");
    } catch (err) {
      toast(err.message, "red");
    } finally {
      setPublishing(false);
    }
  };

  if (published)
    return (
      <div className="page narrow">
        <Card className="step-card center success">
          <PartyPopper size={40} className="green" />
          <h2>Your product is live! <small>आपका उत्पाद अब लाइव है</small></h2>
          <p className="muted">“{published.title}” is now on your storefront and discoverable by verified buyers across India (ONDC-ready).</p>
          <div className="connect-grid">
            <div><Store size={20} /><b>Storefront</b><span>Visible on your public shop page</span></div>
            <div><Handshake size={20} /><b>Buyer linkage</b><span>Bulk buyers can enquire &amp; negotiate</span></div>
            <div><Sparkles size={20} /><b>AI copilot</b><span>Suggests fair counter-offers — you decide</span></div>
          </div>
          <div className="step-actions center">
            <Button variant="outline" onClick={() => navigate(`/market/product/${published.id}`)}>View as Buyer</Button>
            <Button variant="outline" onClick={() => navigate("/artisan/products")}>My Products</Button>
            <Button onClick={() => window.location.reload()} icon={Camera}>Add Another</Button>
          </div>
        </Card>
      </div>
    );

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <Link to="/artisan" className="back-link"><ArrowLeft size={15} /> Dashboard</Link>
          <h1>Add Product with AI</h1>
        </div>
      </div>
      <Stepper step={step} onJump={go} maxReached={maxReached} />
      {step === 0 && <PhotoStep craft={craft} setCraft={setCraft} onPhoto={onPhoto} />}
      {step === 1 && <VoiceStep craft={craft} photo={photos?.original} voice={voice} setVoice={setVoice} onNext={startEnhance} />}
      {step === 2 && <EnhanceStep photos={photos} analysis={analysis} busy={enhancing} craft={craft} onUseCraft={(c) => { setCraft(c); toast(`Craft set to ${craftLabel(c)}`); }} onRetake={() => go(0)} onNext={generate} />}
      {step === 3 && <DetailsStep details={details} setDetails={setDetails} busy={generating} onRegenerate={generate} onNext={() => go(4)} />}
      {step === 4 && <PriceStep craft={craft} details={details} pricing={pricing} setPricing={setPricing} onNext={() => go(5)} />}
      {step === 5 && <ReviewStep photos={photos} details={details} pricing={pricing} craft={craft} onEdit={() => go(3)} onPublish={publish} publishing={publishing} />}
    </div>
  );
}
