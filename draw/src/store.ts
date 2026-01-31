import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { TDAsset, TDBinding, TDShape } from "@tldraw/tldraw";

const VERSION = 1;
const WS_URL = "wss://draw-yjss-server-production.up.railway.app";

type Room = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: any;
  yShapes: Y.Map<TDShape>;
  yBindings: Y.Map<TDBinding>;
  yAssets: Y.Map<TDAsset>;
  undoManager: Y.UndoManager;
};

const rooms: Record<string, Room> = {};

export function getRoom(roomId: string): Room {
  const key = `y-tldraw-${VERSION}-${roomId}`;
  if (rooms[key]) return rooms[key];

  const doc = new Y.Doc();
  const provider = new WebsocketProvider(WS_URL, key, doc, {
    connect: true,
    maxBackoffTime: 10000,
  });
  const awareness = provider.awareness;
  const yShapes: Y.Map<TDShape> = doc.getMap("shapes");
  const yBindings: Y.Map<TDBinding> = doc.getMap("bindings");
  const yAssets: Y.Map<TDAsset> = doc.getMap("assets");
  const undoManager = new Y.UndoManager([yShapes, yBindings]);

  // Лёгкий лог и исправление http → https
  yAssets.observeDeep((events) => {
    if (events.length === 0) return;

    let needsUpdate = false;
    const updates: Record<string, TDAsset> = {};

    yAssets.forEach((asset, id) => {
      if (
        (asset.type === "image" || asset.type === "video") &&
        asset.src?.startsWith("http://")
      ) {
        updates[id] = {
          ...asset,
          src: asset.src.replace(/^http:\/\//, "https://"),
        };
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      doc.transact(() => {
        Object.entries(updates).forEach(([id, fixed]) => {
          yAssets.set(id, fixed);
        });
      });
    }
  });

  const room: Room = { doc, provider, awareness, yShapes, yBindings, yAssets, undoManager };
  rooms[key] = room;
  return room;
}

