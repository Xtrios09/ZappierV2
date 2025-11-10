import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { PeerConnectionProvider } from "@/lib/peer-connection-context";
import Welcome from "@/pages/Welcome";
import ChatApp from "@/pages/ChatApp";
import QRScanner from "@/pages/QRScanner";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/chat" component={ChatApp} />
      <Route path="/scan" component={QRScanner} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <PeerConnectionProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PeerConnectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
