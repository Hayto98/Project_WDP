export function WorkspaceSkeleton() {
  return (
    <div className="workboard" aria-hidden>
      {Array.from({ length: 3 }, (_, c) => (
        <section className="workcol" key={c}>
          <div className="skel" style={{ height: 18, width: "52%", marginBottom: 14 }} />
          {Array.from({ length: 2 }, (_, i) => (
            <div className="workitem workitem--skel" key={i}>
              <div className="skel" style={{ height: 16, width: "70%" }} />
              <div className="skel" style={{ height: 12, width: "92%", marginTop: 10 }} />
              <div className="skel" style={{ height: 12, width: "46%", marginTop: 10 }} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
