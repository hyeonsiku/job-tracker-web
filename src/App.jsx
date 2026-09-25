import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  addInterviewToGoogleCalendar,
  updateInterviewInGoogleCalendar,
  deleteInterviewFromGoogleCalendar,
} from "./lib/googleCalendar";

const STATUSES = ["検討", "応募", "書類", "面接", "最終面接", "オファー", "不採用", "保留", "辞退"];
const TYPES = ["自社開発", "受託開発", "SES/プロジェクト", "混合", "不明"];
const EMPLOYMENTS = ["正社員", "フリーランス"];

function formatDateJP(value) {
  if (!value) return "—";
  const match = String(value).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (!match) return value;
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

const emptyJob = () => ({
  company: "", title: "", employment: "正社員", type: "不明", salary: "", remote: "",
  status: "検討", fit: 3, applied: "", interview_date: "", interview_time: "", url: "",
  tech: "", pros: "", caution: "", memo: "", job_description: "", pdf_path: null,
  google_calendar_id: null, google_calendar_event_id: null,
});

function App() {
  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState(params.get("id") ? "detail" : "list");
  const [selectedId, setSelectedId] = useState(params.get("id"));
  const [modalJob, setModalJob] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadJobs();
    else { setJobs([]); setLoading(false); }
  }, [session]);

  async function loadJobs() {
    setLoading(true); setError("");
    const { data, error: dbError } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (dbError) setError(dbError.message); else setJobs(data || []);
    setLoading(false);
  }

  function navigate(nextView, id = null) {
    const url = id ? `${location.pathname}?id=${encodeURIComponent(id)}` : location.pathname;
    history.pushState({}, "", url);
    setSelectedId(id); setView(nextView);
  }

  useEffect(() => {
    const handler = () => {
      const id = new URLSearchParams(location.search).get("id");
      setSelectedId(id); setView(id ? "detail" : "list");
    };
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);

  if (!session) return <AuthScreen />;
  const selectedJob = jobs.find((job) => job.id === selectedId);

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => navigate("list")}>Job Tracker</button>
        <div className="top-actions"><span>{session.user.email}</span><button className="btn secondary" onClick={() => supabase.auth.signOut()}>ログアウト</button></div>
      </header>
      <main className="container">
        {view === "detail" && selectedJob ? (
          <JobDetail job={selectedJob} onBack={() => navigate("list")} onEdit={() => setModalJob(selectedJob)} onRefresh={loadJobs} setMessage={setMessage} setError={setError} />
        ) : (
          <>
            <section className="card">
              <div className="toolbar">
                <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="会社名・求人名・技術・メモを検索" />
                <select value={employmentFilter} onChange={(e) => setEmploymentFilter(e.target.value)}><option value="">雇用形態</option>{EMPLOYMENTS.map(x => <option key={x}>{x}</option>)}</select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">すべての状態</option>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">タイプ</option>{TYPES.map(x => <option key={x}>{x}</option>)}</select>
                <button className="btn" onClick={() => setModalJob(emptyJob())}>＋ 会社追加</button>
                <ImportButtons userId={session.user.id} jobs={jobs} onRefresh={loadJobs} setMessage={setMessage} setError={setError} />
              </div>
              {message && <div className="notice">{message}</div>}
              {error && <div className="error">{error}</div>}
              <Stats jobs={jobs} />
            </section>
            <JobTable jobs={jobs} query={query} statusFilter={statusFilter} typeFilter={typeFilter} employmentFilter={employmentFilter} onOpen={(id) => navigate("detail", id)} onEdit={(job) => setModalJob(job)} onDelete={async (job) => { if (!confirm(`${job.company} を削除しますか？`)) return; await deleteJob(job, setError); await loadJobs(); }} loading={loading} />
            <InterviewCalendar jobs={jobs} onOpen={(id) => navigate("detail", id)} setMessage={setMessage} setError={setError} />
          </>
        )}
      </main>
      {modalJob && <JobModal job={modalJob} userId={session.user.id} onClose={() => setModalJob(null)} onSaved={async () => { setModalJob(null); await loadJobs(); }} setError={setError} />}
    </>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [mode, setMode] = useState("login"); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setMessage(""); setError("");
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (result.error) setError(result.error.message); else if (mode === "signup" && !result.data.session) setMessage("確認メールを確認してください。");
  }
  return <main className="auth-page"><section className="auth-card"><h1>Job Tracker</h1><p className="muted">求人・応募・面接をまとめて管理</p><form onSubmit={submit}><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" /><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" /><button className="btn">{mode === "login" ? "ログイン" : "新規登録"}</button></form>{message && <p className="notice">{message}</p>}{error && <p className="error">{error}</p>}<button className="link-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "新規登録はこちら" : "ログインはこちら"}</button></section></main>;
}

function Stats({ jobs }) { return <div className="stats">{STATUSES.map(s => <div className="stat" key={s}><b>{jobs.filter(j => j.status === s).length}</b><small>{s}</small></div>)}</div>; }

function JobTable({ jobs, query, statusFilter, typeFilter, employmentFilter, onOpen, onEdit, onDelete, loading }) {
  const rows = useMemo(() => { const q = query.trim().toLowerCase(); return jobs.filter(j => (!q || JSON.stringify(j).toLowerCase().includes(q)) && (!statusFilter || j.status === statusFilter) && (!typeFilter || j.type === typeFilter) && (!employmentFilter || j.employment === employmentFilter)); }, [jobs, query, statusFilter, typeFilter, employmentFilter]);
  if (loading) return <div className="card empty">読み込み中…</div>;
  return <div className="table-wrap"><table><thead><tr><th>会社 / 求人</th><th>雇用</th><th>タイプ</th><th>年収 / 単価</th><th>リモート</th><th>状態</th><th>面接日時</th><th>適合</th><th>操作</th></tr></thead><tbody>{rows.length ? rows.map(j => <tr key={j.id}><td><button className="company-link" onClick={() => onOpen(j.id)}>{j.company}</button><div className="sub">{j.title}</div></td><td>{j.employment}</td><td>{j.type}</td><td>{j.salary}</td><td>{j.remote}</td><td><span className="badge">{j.status}</span></td><td>{j.interview_date ? `${formatDateJP(j.interview_date)}${j.interview_time ? ` ${j.interview_time}` : ""}` : "—"}</td><td>{"★".repeat(Number(j.fit || 0))}{"☆".repeat(Math.max(0, 5 - Number(j.fit || 0)))}</td><td><button className="btn small" onClick={() => onEdit(j)}>編集</button> <button className="btn danger small" onClick={() => onDelete(j)}>削除</button></td></tr>) : <tr><td colSpan="9" className="empty">該当する求人がありません。</td></tr>}</tbody></table></div>;
}

function JobModal({ job, userId, onClose, onSaved, setError }) {
  const [form, setForm] = useState({ ...emptyJob(), ...job }); const [file, setFile] = useState(null); const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (!form.company.trim()) throw new Error("会社名を入力してください。");
      const payload = { ...form, fit: Number(form.fit), applied: form.applied || null, interview_date: form.interview_date || null, interview_time: form.interview_time || null, url: form.url || null };
      delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.pdf_path;
      let saved;
      if (job.id) { const r = await supabase.from("jobs").update(payload).eq("id", job.id).select().single(); if (r.error) throw r.error; saved = r.data; }
      else { const r = await supabase.from("jobs").insert({ ...payload, user_id: userId }).select().single(); if (r.error) throw r.error; saved = r.data; }
      // If a Calendar event is already linked, keep it synchronized with the saved job.
      if (job.id && saved.google_calendar_event_id) {
        if (saved.interview_date) {
          await updateInterviewInGoogleCalendar(saved);
        } else {
          await deleteInterviewFromGoogleCalendar(saved);
          const r = await supabase
            .from("jobs")
            .update({ google_calendar_id: null, google_calendar_event_id: null })
            .eq("id", saved.id);
          if (r.error) throw r.error;
          saved = { ...saved, google_calendar_id: null, google_calendar_event_id: null };
        }
      }

      if (file) {
        if (file.type && file.type !== "application/pdf") throw new Error("PDFファイルのみアップロードできます。");
        if (file.size > 10 * 1024 * 1024) throw new Error("PDFは10MB以下にしてください。");
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const path = `${userId}/${saved.id}/${Date.now()}_${safe}`;
        const up = await supabase.storage.from("job-pdfs").upload(path, file, { contentType: "application/pdf", upsert: false }); if (up.error) throw up.error;
        if (form.pdf_path) await supabase.storage.from("job-pdfs").remove([form.pdf_path]);
        const r = await supabase.from("jobs").update({ pdf_path: path }).eq("id", saved.id); if (r.error) { await supabase.storage.from("job-pdfs").remove([path]); throw r.error; }
      }
      await onSaved();
    } catch (err) { setError(err.message || String(err)); } finally { setSaving(false); }
  }
  return <div className="modal"><div className="dialog"><h2>{job.id ? "会社修正" : "会社追加"}</h2><form onSubmit={save}><div className="grid">{field("会社名 *", "company", "text", true)}{field("求人名", "title")}{selectField("雇用形態", "employment", EMPLOYMENTS)}{selectField("タイプ", "type", TYPES)}{field("年収 / 単価", "salary")}{field("リモート", "remote")}{selectField("状態", "status", STATUSES)}{selectField("適合度", "fit", [5,4,3,2,1])}{field("応募日", "applied", "date")}{field("面接日", "interview_date", "date")}{field("面接時間", "interview_time", "time")}{field("求人URL", "url", "url")}<div className="field full"><label>求人票PDF（10MB以下）</label><input type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files[0] || null)} /><small className="muted">{form.pdf_path ? `現在: ${form.pdf_path.split("/").pop()}` : "PDFなし"}</small></div>{textareaField("求人情報", "job_description", "求人票の内容を貼り付けて保存できます。PDFがなくても入力できます。")}{textareaField("技術 / ポジション", "tech")}{textareaField("長所", "pros")}{textareaField("注意点 / 面接確認", "caution")}{textareaField("メモ", "memo")}</div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>キャンセル</button><button className="btn" disabled={saving}>{saving ? "保存中…" : "保存"}</button></div></form></div></div>;
  function field(label, key, type = "text", required = false) { return <div className="field"><label>{label}</label><input type={type} required={required} value={form[key] ?? ""} onChange={e => update(key, e.target.value)} /></div>; }
  function selectField(label, key, options) { return <div className="field"><label>{label}</label><select value={form[key] ?? ""} onChange={e => update(key, e.target.value)}>{options.map(x => <option key={x} value={x}>{x}</option>)}</select></div>; }
  function textareaField(label, key, placeholder = "") { return <div className="field full"><label>{label}</label><textarea value={form[key] ?? ""} placeholder={placeholder} onChange={e => update(key, e.target.value)} /></div>; }
}

async function deleteJob(job, setError) {
  try {
    if (job.google_calendar_event_id) {
      await deleteInterviewFromGoogleCalendar(job);
    }

    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
    if (error) throw error;

    if (job.pdf_path) {
      const { error: pdfError } = await supabase.storage.from("job-pdfs").remove([job.pdf_path]);
      if (pdfError) throw pdfError;
    }
  } catch (err) {
    setError(err.message || String(err));
  }
}

function JobDetail({ job, onBack, onEdit, onRefresh, setMessage, setError }) {
  const [pdfUrl, setPdfUrl] = useState("");
  useEffect(() => { let active = true; if (job.pdf_path) supabase.storage.from("job-pdfs").createSignedUrl(job.pdf_path, 600).then(({ data, error }) => { if (active && !error) setPdfUrl(data.signedUrl); }); return () => { active = false; }; }, [job.pdf_path]);
  async function removePdf() { if (!confirm("PDFを削除しますか？")) return; const { error } = await supabase.storage.from("job-pdfs").remove([job.pdf_path]); if (error) { setError(error.message); return; } const r = await supabase.from("jobs").update({ pdf_path: null }).eq("id", job.id); if (r.error) setError(r.error.message); else { setMessage("PDFを削除しました。"); await onRefresh(); } }
  return <section><div className="detail-head"><button className="btn secondary" onClick={onBack}>← 一覧</button><div><h1>{job.company}</h1><p className="muted">{job.title}</p></div><button className="btn" onClick={onEdit}>編集</button></div><div className="detail-grid"><InfoCard title="基本情報"><Info label="雇用形態" value={job.employment}/><Info label="タイプ" value={job.type}/><Info label="年収 / 単価" value={job.salary}/><Info label="リモート" value={job.remote}/><Info label="状態" value={job.status}/><Info label="適合度" value={`${job.fit}/5`}/><Info label="応募日" value={formatDateJP(job.applied)}/><Info label="面接" value={job.interview_date ? `${formatDateJP(job.interview_date)}${job.interview_time ? ` ${job.interview_time}` : ""}` : "—"}/>{job.url && <a href={job.url} target="_blank" rel="noreferrer">求人URL</a>}<div className="actions"><GoogleCalendarButton job={job} setMessage={setMessage} setError={setError} /></div></InfoCard><InfoCard title="求人情報"><p className="pre">{job.job_description || "求人情報は登録されていません。"}</p></InfoCard><InfoCard title="技術 / ポジション"><p className="pre">{job.tech || "—"}</p></InfoCard><InfoCard title="長所"><p className="pre">{job.pros || "—"}</p></InfoCard><InfoCard title="注意点 / 面接確認"><p className="pre">{job.caution || "—"}</p></InfoCard><InfoCard title="メモ"><p className="pre">{job.memo || "—"}</p></InfoCard><InfoCard title="求人票PDF"><div className="actions">{pdfUrl && <a className="btn" href={pdfUrl} target="_blank" rel="noreferrer">PDFを開く</a>}{job.pdf_path && <button className="btn danger" onClick={removePdf}>PDF削除</button>}</div>{pdfUrl && <iframe className="pdf-frame" src={pdfUrl} title="求人票PDF" />}{!job.pdf_path && <p className="muted">PDFなし</p>}</InfoCard></div></section>;
}
function InfoCard({ title, children }) { return <div className="card"><h2>{title}</h2>{children}</div>; }
function Info({ label, value }) { return <div className="info"><small>{label}</small><b>{value || "—"}</b></div>; }

function GoogleCalendarButton({ job, setMessage, setError }) {
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true); setMessage(""); setError("");
    try {
      const event = await addInterviewToGoogleCalendar(job);
      const { error } = await supabase
        .from("jobs")
        .update({
          google_calendar_id: "primary",
          google_calendar_event_id: event.id,
        })
        .eq("id", job.id);
      if (error) throw error;
      setMessage("Google Calendarに追加しました。");
      if (event.htmlLink) {
        window.open(event.htmlLink, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(`Google Calendar追加エラー: ${err.message}`);
    } finally { setBusy(false); }
  }
  return <button className="btn secondary" disabled={busy || !job.interview_date} onClick={add}>{busy ? "追加中…" : "Google Calendarに追加"}</button>;
}

function InterviewCalendar({ jobs, onOpen, setMessage, setError }) {
  const interviews = jobs.filter(j => j.interview_date).sort((a,b) => `${a.interview_date}${a.interview_time||""}`.localeCompare(`${b.interview_date}${b.interview_time||""}`));
  return <section className="card calendar"><h2>面接予定</h2>{interviews.length ? <div className="calendar-list">{interviews.map(j => <div key={j.id} className="calendar-item"><button className="calendar-item-main" onClick={() => onOpen(j.id)}><span>{formatDateJP(j.interview_date)}</span><b>{j.interview_time || "時間未定"}</b><strong>{j.company}</strong><small>{j.title}</small></button><GoogleCalendarButton job={j} setMessage={setMessage} setError={setError} /></div>)}</div> : <p className="muted">面接予定はありません。</p>}</section>;
}

function ImportButtons({ userId, jobs, onRefresh, setMessage, setError }) {
  const [jsonBusy, setJsonBusy] = useState(false); const [pdfBusy, setPdfBusy] = useState(false);
  async function importJson(file) { if (!file) return; setJsonBusy(true); setError(""); try { const legacy = JSON.parse(await file.text()); if (!Array.isArray(legacy)) throw new Error("JSONの形式が配列ではありません。"); const existing = new Set(jobs.map(j => `${j.company}\n${j.title}`)); const rows = legacy.filter(j => j?.company && !existing.has(`${j.company}\n${j.title || ""}`)).map(j => ({ user_id:userId, company:j.company, title:j.title||"", employment:j.employment||"正社員", type:j.type||"不明", salary:j.salary||"", remote:j.remote||"", status:STATUSES.includes(j.status)?j.status:"検討", fit:Math.min(5,Math.max(1,Number(j.fit)||3)), applied:j.applied ? String(j.applied).slice(0,10):null, interview_date:(j.interviewDate??j.interview_date) ? String(j.interviewDate??j.interview_date).slice(0,10):null, interview_time:(j.interviewTime??j.interview_time) ? String(j.interviewTime??j.interview_time).slice(0,5):null, url:j.url||null, tech:j.tech||"", pros:j.pros||"", caution:j.caution||"", memo:j.memo||"", job_description:j.job_description||j.jdText||"" })); if (rows.length) { const { error } = await supabase.from("jobs").insert(rows); if (error) throw error; } await onRefresh(); setMessage(`${rows.length}件を取り込みました。`); } catch(e) { setError(`JSON取込エラー: ${e.message}`); } finally { setJsonBusy(false); } }
  async function importPdfs(files) { if (!files?.length) return; setPdfBusy(true); setError(""); const results=[]; try { const byCompany={}; jobs.forEach(j => (byCompany[j.company]??=[]).push(j)); for (const file of files) { const candidates=Object.entries(byCompany).filter(([c])=>file.name.includes(c)).flatMap(([,items])=>items); if (file.type && file.type!=="application/pdf" || file.size>10*1024*1024 || candidates.length!==1) { results.push(`SKIP ${file.name}`); continue; } const job=candidates[0]; const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const path=`${userId}/${job.id}/${Date.now()}_${safe}`; const up=await supabase.storage.from("job-pdfs").upload(path,file,{contentType:"application/pdf",upsert:false}); if(up.error)throw up.error; if(job.pdf_path)await supabase.storage.from("job-pdfs").remove([job.pdf_path]); const r=await supabase.from("jobs").update({pdf_path:path}).eq("id",job.id); if(r.error)throw r.error; results.push(`OK ${file.name} → ${job.company}`); } await onRefresh(); setMessage(results.join("\n")); } catch(e) { setError(`PDF取込エラー: ${e.message}\n${results.join("\n")}`); } finally { setPdfBusy(false); } }
  return <><label className="btn secondary">{jsonBusy?"取込中…":"JSON一括取込"}<input hidden type="file" accept="application/json,.json" onChange={e=>importJson(e.target.files[0])}/></label><label className="btn secondary">{pdfBusy?"取込中…":"PDF一括取込"}<input hidden type="file" accept="application/pdf,.pdf" multiple onChange={e=>importPdfs(e.target.files)}/></label></>;
}

export default App;
