import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function PrivacyPolicy() {
  return (
    <main style={styles.page}>
      <article style={styles.card}>
        <h1>Privacy Policy</h1>
        <p style={styles.muted}>Job Tracker</p>
        <p>最終更新日: 2026-09-17</p>

        <h2>1. 概要</h2>
        <p>
          Job Tracker は、求人情報、応募状況、面接予定などを管理するための個人向けWebアプリケーションです。
        </p>

        <h2>2. 収集・保存する情報</h2>
        <p>
          アプリケーションでは、ログインのためのメールアドレス、求人情報、応募・面接に関する情報、
          およびユーザーがアップロードした求人票PDFを保存します。これらの情報はSupabaseを利用して保存・管理します。
        </p>

        <h2>3. Googleユーザーデータの利用</h2>
        <p>
          ユーザーがGoogle Calendar連携を利用する場合、Job TrackerはユーザーのGoogleアカウントへの認可を求め、
          Google Calendarのイベントをユーザーの指示に基づいて作成・更新するために必要な範囲でGoogle Calendar APIを利用します。
        </p>
        <p>
          Googleから取得した情報を広告目的で利用したり、販売したり、第三者へ提供したりすることはありません。
          Googleユーザーデータの利用は、アプリケーションの機能提供に必要な範囲に限定します。
        </p>

        <h2>4. 情報の共有</h2>
        <p>
          ユーザーの情報を第三者へ販売・共有することはありません。アプリケーションの運営に必要なサービスとして、
          Supabaseなどのサービスプロバイダーを利用しています。
        </p>

        <h2>5. データの管理</h2>
        <p>
          ユーザーはアプリケーション上で自身の求人情報やアップロードしたPDFを管理・削除できます。
          Google Calendarとの連携については、Googleアカウント側からアクセス権を取り消すこともできます。
        </p>

        <h2>6. セキュリティ</h2>
        <p>
          アプリケーションでは認証およびアクセス制御を利用し、ユーザーごとのデータが他のユーザーから参照されないよう管理します。
        </p>

        <h2>7. お問い合わせ</h2>
        <p>
          本ポリシーに関するお問い合わせは、Job Trackerの開発者が提供する連絡先までご連絡ください。
        </p>

        <a href="/job-tracker-web/">Job Trackerに戻る</a>
      </article>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "40px 20px",
    boxSizing: "border-box",
    background: "#f6f7f9",
    color: "#222",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    lineHeight: 1.7,
  },
  card: {
    maxWidth: 820,
    margin: "0 auto",
    padding: "36px 40px",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  muted: { color: "#666", marginTop: -10 },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PrivacyPolicy />
  </StrictMode>,
);
