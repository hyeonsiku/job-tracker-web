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
  if (accessToken && Date.now() < expiresAt - 60000) return accessToken;

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    });
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error));
        return;
      }
      accessToken = response.access_token;
      expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
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

  const start = `${date}T${time}:00+09:00`;
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  return {
    summary,
    description,
    start: { dateTime: start, timeZone: "Asia/Tokyo" },
    end: { dateTime: endDate.toISOString(), timeZone: "Asia/Tokyo" },
  };
}

export async function addInterviewToGoogleCalendar(job) {
  const token = await getAccessToken();
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildEvent(job)),
    },
  );

  if (!response.ok) {
    let message = `Google Calendar API error (${response.status})`;
    try {
      const body = await response.json();
      message = body?.error?.message || message;
    } catch {
      // Keep the status message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json();
}
