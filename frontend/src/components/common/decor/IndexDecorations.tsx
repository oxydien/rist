import "../../../assets/styles/common/decor/indexdecor.css";
import { useEffect, useState } from "preact/hooks";

export default function IndexDecorations() {
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);

	useEffect(() => {
		const handleResize = () => setScreenWidth(window.innerWidth);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<div className="index-decorations" style={{ "--screen-width": `${screenWidth}px` }}>
			<div className="index-decorations-background" />
			<div className="index-decorations-left" />
			<div className="index-decorations-right" />
		</div>
	);
}
