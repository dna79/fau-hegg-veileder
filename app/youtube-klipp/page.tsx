export const metadata = {
  title: "YouTube-klipp 08:47–11:39",
  description: "Videoavsnitt fra 08:47 til 11:39",
};

export default function YouTubeKlippPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "min(1100px, 100%)" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#000",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <iframe
            src="https://www.youtube.com/embed/PRgBdAAkmcs?start=527&end=699&autoplay=1&mute=1&playsinline=1&rel=0"
            title="YouTube-klipp 08:47–11:39"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>
        <p style={{ opacity: 0.75, fontSize: 14, lineHeight: 1.5 }}>
          Klippet starter automatisk på 08:47 og stopper på 11:39. Videoen
          starter uten lyd fordi nettlesere normalt blokkerer autoplay med lyd;
          slå på lyd i YouTube-spilleren.
        </p>
      </div>
    </main>
  );
}
