import { useEffect, useState } from "preact/hooks";

export default function IndexDecorations() {
	import("../../../assets/styles/public/landing-decorations.css");

	const [screenWidth, setScreenWidth] = useState(window.innerWidth);
	const [bgOffsetX, setBgOffsetX] = useState(0);
	const [bgOffsetY, setBgOffsetY] = useState(0);

	useEffect(() => {
		const handleResize = () => setScreenWidth(window.innerWidth);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		const handleMouseMove = (event:MouseEvent) => {
			setBgOffsetX(event.clientX);
			setBgOffsetY(event.clientY);
		}
		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return (
		<div className="index-decorations" style={{ "--screen-width": `${screenWidth}px`, "--offset-x": `${bgOffsetX}px`, "--offset-y": `${bgOffsetY}px` }}>
			<div className="index-decorations-background" />
			<div className="index-decorations-beat" />
			<div className="index-decorations-spotlight" />
		</div>
	);
}
