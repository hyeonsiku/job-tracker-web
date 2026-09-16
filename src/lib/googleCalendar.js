const CLIENT_ID = window.GOOGLE_CONFIG?.clientId;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let tokenClient = null;
let accessToken = null;
let expiresAt = 0;

function waitForGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > 10000) {
        clearInterval(timer);
        reject(new Error("Google認証ライブラリの読み込みに失敗しました。"));
      }
    }, 100);
  });
}

async function getAccessToken() {
  if (!CLIENT_ID) throw new Error("Google Calendar Client IDが設定されていません。");

  await waitForGoogle();

  if (accessToken && Date.now() < expiresAt - 60000) {
    return accessToken;
  }

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    });
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Google認証の応答を受信できませんでした。もう一度お試しください。"));
    }, 30000);

    tokenClient.callback = (response) => {
      console.debug("[Job Tracker] Google OAuth response", response);

      if (response.error) {
        clearTimeout(timeout);
        settled = true;
        reject(new Error(response.error_description || response.error));
        return;
      }

      if (!response.access_token) {
        clearTimeout(timeout);
        settled = true;
        reject(new Error("Googleからアクセストークンを取得できませんでした。"));
        return;
      }

      accessToken = response.access_token;
      expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
      clearTimeout(timeout);
      settled = true;
      resolve(accessToken);
    };

    console.debug("[Job Tracker] Requesting Google Calendar access");
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

function formatLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}+09:00`;
}

function buildEvent(job) {
  const date = job.interview_date;
  const time = job.interview_time;
  if (!date) throw new Error("面接日が設定されていません。");

  const summary = `[面接] ${job.company}${job.title ? ` - ${job.title}` : ""}`;
  const description = [
    job.url ? `求人URL: ${job.url}` : "",
    job.tech ? `技術 / ポジション: ${job.tech}` : "",
    job.memo ? `メモ: ${job.memo}` : "",
  ].filter(Boolean).join("\n");

  if (!time) {
    const nextDate = new Date(`${date}T00:00:00+09:00`);
    nextDate.setDate(nextDate.getDate() + 1);
    return {
      summary,
      description,
      start: { date, timeZone: "Asia/Tokyo" },
      end: { date: nextDate.toISOString().slice(0, 10), timeZone: "Asia/Tokyo" },
    };
  }

  // Supabase time values may be returned as HH:mm:ss. Normalize to HH:mm.
  const normalizedTime = String(time).slice(0, 5);
  const startDate = new Date(`${date}T${normalizedTime}:00+09:00`);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`面接時間の形式が不正です: ${time}`);
  }

  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    summary,
    description,
    start: { dateTime: formatLocalDateTime(startDate), timeZone: "Asia/Tokyo" },
    end: { dateTime: formatLocalDateTime(endDate), timeZone: "Asia/Tokyo" },
  };
}

export async function addInterviewToGoogleCalendar(job) {
  console.debug("[Job Tracker] Adding interview to Google Calendar", job);

  const token = await getAccessToken();
  const event = buildEvent(job);

  console.debug("[Job Tracker] Sending Calendar API request", event);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!response.ok) {
    let message = `Google Calendar API error (${response.status})`;
    try {
      const body = await response.json();
      console.error("[Job Tracker] Google Calendar API error", body);
      message = body?.error?.message || message;
    } catch {
      // Keep the status message when the response is not JSON.
    }
    throw new Error(message);
  }

  const result = await response.json();
  console.debug("[Job Tracker] Calendar event created", result);
  return result;
}
