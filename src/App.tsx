import { useEffect, useState } from "react";
import { HomeScreen } from "./home/HomeScreen";
import { BoardScreen } from "./board/BoardScreen";
import { requestPersistentStorage } from "./storage/db";

/** Very small hash router: "#/board/<id>" opens a board, anything else is the library. */
function parseRoute(): { boardId: string | null } {
  const m = /^#\/board\/([\w-]+)/.exec(window.location.hash);
  return { boardId: m ? m[1] : null };
}

export function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    void requestPersistentStorage();
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route.boardId) {
    return (
      <BoardScreen
        key={route.boardId}
        boardId={route.boardId}
        onExit={() => (window.location.hash = "")}
      />
    );
  }
  return <HomeScreen onOpen={(id) => (window.location.hash = `#/board/${id}`)} />;
}
