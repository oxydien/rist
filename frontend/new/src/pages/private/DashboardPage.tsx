import ModuleCard from "../../components/common/ModuleCard";
import Aside from "../../components/common/nav/Aside";
import { useAppStore } from "../../stores/appStore";
import PageWrapper from "./PageWrapper";

export default function DashboardPage() {
  import("../../assets/styles/private/main.css");
  import("../../assets/styles/private/dashboard.css");

  const modules = useAppStore().modules;
  return (
    <PageWrapper>
      <Aside />

      <main>
        <h1>Dashboard</h1>
        <section className="modules">
          <h2>Modules</h2>
          <div className="grid">
            {modules.map((module) => (
              <ModuleCard key={module.name} info={module} clickable />
            ))}
          </div>
        </section>
      </main>
    </PageWrapper>
  );
}
