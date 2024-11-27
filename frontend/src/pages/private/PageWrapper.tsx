// AKA dashboard layout

interface PageWrapperProps {
  children: React.ReactNode,
}

export default function PageWrapper({...props}: PageWrapperProps) {
  return (
    <div className="page-wrapper">
      {props.children}
    </div>
  );
}