import { useLocalSearchParams } from "expo-router";
export default function NativePreview() {
  const { role, page } = useLocalSearchParams<{ role?: string; page?: string }>();
  const portal = role === "supervisor" || role === "workshop" ? role : "student";
  const reportPage = page === "messages" || page === "reports";
  const uri = reportPage
    ? `/native/${portal}/${page}`
    : portal === "student"
      ? "/native"
      : `/native/${portal}/dashboard`;
  return (
    <div className="phone-preview-stage">
      <style>{`
      html,body,#root{margin:0;height:100%;}
      .phone-preview-stage{height:100dvh;box-sizing:border-box;overflow:auto;background:radial-gradient(ellipse at 50% 20%,#e4ebdf,#e9e5dc 70%);font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:16px;gap:14px;color:#293925;}
      .phone-preview-toolbar{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;flex-shrink:0;}
      .phone-preview-toolbar strong{margin-inline-end:10px;font-size:15px;}
      .phone-preview-toolbar a{font-size:13px;line-height:20px;padding:8px 16px;border:1px solid #bdc9b4;border-radius:24px;text-decoration:none;color:#405137;background:#ffffffa3;}
      .phone-preview-toolbar a[aria-current=page]{background:#526443;color:white;border-color:#526443;}
      .phone-preview-frame{position:relative;width:390px;height:min(844px,calc(100dvh - 120px));min-height:420px;flex-shrink:0;border:9px solid #242a23;box-sizing:content-box;border-radius:46px;background:#eee8dc;box-shadow:0 24px 65px #273b2730,inset 0 0 0 1px #7b8376;overflow:hidden;}
      .phone-preview-screen{width:100%;height:100%;display:block;border:0;background:#eee8dc;}
      .phone-preview-home{position:absolute;bottom:5px;left:50%;transform:translateX(-50%);height:4px;width:110px;border-radius:9px;background:#24312460;pointer-events:none;}
      .phone-preview-size{font-size:11px;color:#67735e;flex-shrink:0;}
      @media(max-width:460px){.phone-preview-stage{padding:10px;gap:10px;}.phone-preview-toolbar strong{display:none;}.phone-preview-frame{width:calc(100vw - 38px);height:calc(100dvh - 115px);border-radius:34px;min-height:320px;}}
    `}</style>
      <nav className="phone-preview-toolbar" aria-label="Preview role">
        <strong>LabAssist</strong>
        {[
          { id: "student", label: "الطالب", href: "/native-preview?role=student" },
          { id: "supervisor", label: "المشرف", href: "/native-preview?role=supervisor" },
          { id: "workshop", label: "مسؤول الورشة", href: "/native-preview?role=workshop" },
        ].map((role) => (
          <a
            key={role.id}
            href={role.href + (reportPage ? `&page=${page}` : "")}
            aria-current={portal === role.id ? "page" : undefined}
          >
            {role.label}
          </a>
        ))}
      </nav>
      <div className="phone-preview-frame">
        <iframe
          className="phone-preview-screen"
          src={uri}
          title={`LabAssist ${portal}`}
          allow="camera; microphone; fullscreen; clipboard-write"
        />
        <div className="phone-preview-home" />
      </div>
      <span className="phone-preview-size">390 px · معاينة React Native بحجم الهاتف</span>
    </div>
  );
}
