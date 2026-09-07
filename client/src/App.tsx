import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { BASE_PATH } from "@/lib/baseUrl";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Fairness from "./pages/Fairness";
import History from "./pages/History";
import Home from "./pages/Home";
import HowToPlay from "./pages/HowToPlay";
import Landing from "./pages/Landing";

function Router() {
  return (
    <WouterRouter base={BASE_PATH}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/game" component={Home} />
        <Route path="/how-to-play" component={HowToPlay} />
        <Route path="/fairness" component={Fairness} />
        <Route path="/history" component={History} />
        <Route component={Landing} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
