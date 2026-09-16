const { createClient } = window.supabase;
const db = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
const statuses = ["検討", "지원", "서류", "면접", "최종", "오퍼", "탈락", "보류", "辞退"];
let user = null, jobs = [], editingId = null;
const $ = (id) => document.getElementById(id);
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function message(text, error=false){ $("message").textContent=text||""; $("message").className=error?"error":"notice"; }
function appMessage(text,error=false){ $("appMessage").textContent=text||""; $("appMessage").className=error?"error":"notice"; }
function badge(s){ return `<span class="badge">${esc(s||"")}</span>`; }
function setStatusOptions(){ $("statusFilter").innerHTML='<option value="">すべての状態</option>'+statuses.map(s=>`<option>${esc(s)}</option>`).join(""); $("fStatus").innerHTML=statuses.map(s=>`<option>${esc(s)}</option>`).join(""); }
function resetForm(){ $("jobForm").reset(); $("fStatus").value="検討"; $("fFit").value="3"; $("currentPdf").textContent="PDFなし"; $("formError").textContent=""; editingId=null; $("modalTitle").textContent="会社追加"; }
function openModal(job=null){ resetForm(); if(job){ editingId=job.id; $("modalTitle").textContent="会社修正"; const map={fCompany:"company",fTitle:"title",fEmployment:"employment",fType:"type",fSalary:"salary",fRemote:"remote",fStatus:"status",fFit:"fit",fApplied:"applied",fInterviewDate:"interview_date",fInterviewTime:"interview_time",fUrl:"url",fTech:"tech",fPros:"pros",fCaution:"caution",fMemo:"memo"}; for(const [id,key] of Object.entries(map)) $(id).value=job[key]??""; $("currentPdf").textContent=job.pdf_path?`現在: ${job.pdf_path.split("/").pop()}`:"PDFなし"; } $("modal").classList.add("open"); }
function closeModal(){ $("modal").classList.remove("open"); }
async function loadJobs(){ const {data,error}=await db.from("jobs").select("*").order("created_at",{ascending:false}); if(error)return message(error.message,true); jobs=data||[]; render(); }
function render(){ const q=$("search").value.trim().toLowerCase(),sf=$("statusFilter").value,tf=$("typeFilter").value,ef=$("employmentFilter").value; const rows=jobs.filter(j=>(!q||JSON.stringify(j).toLowerCase().includes(q))&&(!sf||j.status===sf)&&(!tf||j.type===tf)&&(!ef||j.employment===ef)); $("countText").textContent=`${rows.length}件`; $("tbody").innerHTML=rows.map(j=>`<tr><td><a class="company" href="company.html?id=${encodeURIComponent(j.id)}">${esc(j.company)}</a><div class="sub">${esc(j.title)}</div></td><td>${esc(j.employment)}</td><td>${esc(j.type)}</td><td>${esc(j.salary)}</td><td>${esc(j.remote)}</td><td>${badge(j.status)}</td><td>${esc([j.interview_date,j.interview_time].filter(Boolean).join(" ")||"—")}</td><td>${"★".repeat(Number(j.fit||0))}${"☆".repeat(Math.max(0,5-Number(j.fit||0)))}</td><td><button class="btn small" data-edit="${j.id}">編集</button> <button class="btn danger small" data-delete="${j.id}">削除</button></td></tr>`).join("")||'<tr><td colspan="9" class="empty">該当する求人がありません。</td></tr>'; $("stats").innerHTML=statuses.map(s=>`<div class="stat"><b>${jobs.filter(j=>j.status===s).length}</b><small>${esc(s)}</small></div>`).join(""); }
function formValue(id){ return $(id).value.trim(); }
async function uploadPdf(jobId,file){ if(!file)return null; if(file.type!=="application/pdf")throw new Error("PDFファイルのみアップロードできます。"); if(file.size>10*1024*1024)throw new Error("PDFは10MB以下にしてください。"); const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const path=`${user.id}/${jobId}/${Date.now()}_${safe}`; const {error}=await db.storage.from("job-pdfs").upload(path,file,{contentType:"application/pdf",upsert:false}); if(error)throw error; return path; }
async function deletePdf(path){ if(path)await db.storage.from("job-pdfs").remove([path]); }
async function saveJob(e){ e.preventDefault(); $("saveBtn").disabled=true; $("formError").textContent=""; try{ const payload={company:formValue("fCompany"),title:formValue("fTitle"),employment:$("fEmployment").value,type:$("fType").value,salary:formValue("fSalary"),remote:formValue("fRemote"),status:$("fStatus").value,fit:Number($("fFit").value),applied:$("fApplied").value||null,interview_date:$("fInterviewDate").value||null,interview_time:$("fInterviewTime").value||null,url:formValue("fUrl")||null,tech:$("fTech").value,pros:$("fPros").value,caution:$("fCaution").value,memo:$("fMemo").value}; if(!payload.company)throw new Error("会社名を入力してください。"); let job,old; if(editingId){ old=jobs.find(j=>j.id===editingId); const r=await db.from("jobs").update(payload).eq("id",editingId).select().single(); if(r.error)throw r.error; job=r.data; }else{ const r=await db.from("jobs").insert({...payload,user_id:user.id}).select().single(); if(r.error)throw r.error; job=r.data; } const file=$("fPdf").files[0]; if(file){ const path=await uploadPdf(job.id,file); if(old?.pdf_path)await deletePdf(old.pdf_path); const r=await db.from("jobs").update({pdf_path:path}).eq("id",job.id); if(r.error){await deletePdf(path);throw r.error;} } closeModal(); await loadJobs(); }catch(err){$("formError").textContent=err.message||String(err);}finally{$("saveBtn").disabled=false;} }
async function removeJob(id){ const job=jobs.find(j=>j.id===id); if(!job||!confirm(`${job.company} を削除しますか？`))return; const {error}=await db.from("jobs").delete().eq("id",id); if(error)return message(error.message,true); if(job.pdf_path)await deletePdf(job.pdf_path); await loadJobs(); }
function normalizeDate(v){ return v ? String(v).slice(0,10) : null; }
function normalizeTime(v){ return v ? String(v).slice(0,5) : null; }
async function importLegacyJson(file){
  if(!file)return;
  try{
    appMessage("JSONを読み込んでいます…");
    const text=await file.text();
    const legacy=JSON.parse(text);
    if(!Array.isArray(legacy))throw new Error("JSONの形式が配列ではありません。");
    const existing=new Set(jobs.map(j=>`${j.company}\n${j.title}`));
    const rows=[];
    let skipped=0;
    for(const j of legacy){
      if(!j?.company)continue;
      const key=`${j.company}\n${j.title||""}`;
      if(existing.has(key)){skipped++;continue;}
      let memo=j.memo||"";
      if(j.jdText) memo += `${memo?"\n\n":""}[求人票]\n${j.jdText}`;
      rows.push({
        user_id:user.id,
        company:j.company,
        title:j.title||"",
        employment:j.employment||"正社員",
        type:j.type||"不明",
        salary:j.salary||"",
        remote:j.remote||"",
        status:statuses.includes(j.status)?j.status:"検討",
        fit:Math.min(5,Math.max(1,Number(j.fit)||3)),
        applied:normalizeDate(j.applied),
        interview_date:normalizeDate(j.interviewDate??j.interview_date),
        interview_time:normalizeTime(j.interviewTime??j.interview_time),
        url:j.url||null,
        tech:j.tech||"",
        pros:j.pros||"",
        caution:j.caution||"",
        memo
      });
    }
    if(!rows.length){appMessage(`追加する求人はありません（${skipped}件は既存データ）。`);return;}
    const {error}=await db.from("jobs").insert(rows);
    if(error)throw error;
    await loadJobs();
    appMessage(`${rows.length}件を取り込みました。既存 ${skipped}件はスキップしました。`);
  }catch(err){appMessage(`取込エラー: ${err.message||String(err)}`,true);}
  finally{$("importFile").value="";}
}
async function init(){ setStatusOptions(); const {data}=await db.auth.getSession(); user=data.session?.user||null; if(!user){$("authSection").classList.remove("hidden");$("app").classList.add("hidden");return;} $("authSection").classList.add("hidden");$("app").classList.remove("hidden");await loadJobs(); }
$("signInBtn").onclick=async()=>{const r=await db.auth.signInWithPassword({email:formValue("email"),password:$("password").value});if(r.error)message(r.error.message,true);else init();};
$("signUpBtn").onclick=async()=>{const r=await db.auth.signUp({email:formValue("email"),password:$("password").value});if(r.error)message(r.error.message,true);else message(r.data.session?"登録しました。":"確認メールを確認してください。");};
$("signOutBtn").onclick=async()=>{await db.auth.signOut();location.reload();};
$("newBtn").onclick=()=>openModal();$("cancelBtn").onclick=closeModal;$("jobForm").onsubmit=saveJob;
$("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=()=>importLegacyJson($("importFile").files[0]);
["search","statusFilter","typeFilter","employmentFilter"].forEach(id=>$(id).oninput=render);
$("tbody").onclick=e=>{const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");if(edit)openModal(jobs.find(j=>j.id===edit.dataset.edit));if(del)removeJob(del.dataset.delete);};
init();
