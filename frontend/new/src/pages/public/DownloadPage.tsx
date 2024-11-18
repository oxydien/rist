import { useEffect, useRef, useState } from "preact/hooks";

export default function DownloadPage() {
  const [error, setError] = useState("");
  const [uuid, setUUID] = useState("");
  const [verbose, setVerbose] = useState("Checking UUID in URL...");
  const [status, setStatus] = useState("Fetching");

  import("../../assets/styles/public/main.css");

  useEffect(() => {
    const url = new URL(window.location.href);
    const uuid = url.searchParams.get("u") || url.searchParams.get("uuid");
    if (uuid) {
      setUUID(uuid);
			setVerbose(`Found UUID: ${uuid}`);
    } else {
      setStatus("Error");
      setError(
        "It looks like the UUID wasn't specified in the URL. This is necessary to download the file. Make sure to keep the ?u=... in the URL."
      );
    }
  }, []);

  const errorElement = error ? <p className="error">{String(error)}</p> : null;
  return (
    <main>
      <h1>{status}</h1>
			<p className={"verbose"}>{verbose}</p>
      {errorElement}
    </main>
  );
}
