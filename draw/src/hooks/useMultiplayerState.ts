import { useCallback, useEffect, useRef } from "react";
import { TDBinding, TDShape, TDUser, TldrawApp } from "@tldraw/tldraw";
import { getRoom } from "../store";

export function useMultiplayerState(roomId: string) {
  const tldrawRef = useRef<TldrawApp>();
  const roomRef = useRef(getRoom(roomId));

  useEffect(() => {
    roomRef.current = getRoom(roomId);
  }, [roomId]);

  // Основная функция синхронизации всего контента
  const syncContent = useCallback(() => {
    const app = tldrawRef.current;
    if (!app) return;

    const { yAssets, yShapes, yBindings } = roomRef.current;

    // Получаем все ассеты и фильтруем те, что имеют правильную структуру
    const allAssets = Object.fromEntries(yAssets.entries());
    const validAssets = Object.fromEntries(
      Object.entries(allAssets).filter(([_, asset]) => {
        return asset?.id && asset?.type && asset?.src;
      }),
    );

    const defaultStyle = {
      color: "black",
      size: "medium",
      dash: "draw",
      scale: "1",
    };

    const allShapes = Object.fromEntries(yShapes.entries());
    const validShapes = Object.fromEntries(
      Object.entries(allShapes)
        .filter(([_, shape]) => {
          if (!shape) return false;
          if (shape.assetId && !validAssets[shape.assetId]) {
            console.warn(
              `Shape ${shape.id} ссылается на несуществующий ассет ${shape.assetId}`,
            );
            return false;
          }
          return true;
        })
        .map(([id, shape]) => {
          if (!shape.style || typeof shape.style !== "object") {
            shape = {
              ...shape,
              style: defaultStyle as any,
            };
          }
          return [id, shape];
        }),
    );

    app.replacePageContent(
      validShapes,
      Object.fromEntries(yBindings.entries()),
      validAssets,
      undefined,
    );
  }, [roomRef]);

  // onMount
  const onMount = useCallback(
    (app: TldrawApp) => {
      app.loadRoom(roomId);
      app.pause();
      tldrawRef.current = app;

      // Первичная загрузка всего состояния из yjs
      syncContent();
    },
    [roomId, syncContent],
  );

  // Сохранение изменений локального пользователя в yjs
  const onChangePage = useCallback(
    (
      app: TldrawApp,
      shapes: Record<string, TDShape | undefined>,
      bindings: Record<string, TDBinding | undefined>,
    ) => {
      const { undoManager, yShapes, yBindings, doc } = roomRef.current;
      undoManager.stopCapturing();

      const defaultStyle = {
        color: "black",
        size: "medium",
        dash: "draw",
        scale: "1",
      };

      doc.transact(() => {
        Object.entries(shapes).forEach(([id, shape]) => {
          if (!shape) {
            yShapes.delete(id);
          } else {
            const shapeToSave = {
              ...shape,
              style: shape.style || defaultStyle,
            } as any;
            yShapes.set(shape.id, shapeToSave);
          }
        });

        Object.entries(bindings).forEach(([id, binding]) => {
          if (!binding) {
            yBindings.delete(id);
          } else {
            yBindings.set(binding.id, binding);
          }
        });
      });
    },
    [],
  );

  // Undo / Redo
  const onUndo = useCallback(() => roomRef.current.undoManager.undo(), []);
  const onRedo = useCallback(() => roomRef.current.undoManager.redo(), []);

  // Передача текущего пользователя в awareness
  const onChangePresence = useCallback((app: TldrawApp, user: TDUser) => {
    roomRef.current.awareness.setLocalStateField("tdUser", user);
  }, []);

  // Синхронизация пользователей (awareness)
  useEffect(() => {
    const onChangeAwareness = () => {
      const app = tldrawRef.current;
      if (!app || !app.room) return;

      const awareness = roomRef.current.awareness;

      const states = Array.from(awareness.getStates().entries()) as Array<[any, any]>;
      const others = states
        .filter(([key]) => key !== awareness.clientID)
        .map(([, state]) => state)
        .filter((state): state is { tdUser: TDUser } => !!state && !!(state as any).tdUser);

      const remoteUserIds = others.map((s) => s.tdUser.id);

      Object.values(app.room.users).forEach((user) => {
        if (
          user &&
          !remoteUserIds.includes(user.id) &&
          user.id !== app.room?.userId
        ) {
          app.removeUser(user.id);
        }
      });

      app.updateUsers(others.map((s) => s.tdUser));
    };

    const awareness = roomRef.current.awareness;
    awareness.on("change", onChangeAwareness);
    return () => awareness.off("change", onChangeAwareness);
  }, []);

  // Синхронизация содержимого при любом изменении yjs-карт
  useEffect(() => {
    // Первичная синхронизация (на случай, если что-то уже было в yjs)
    syncContent();

    const { yShapes, yBindings, yAssets } = roomRef.current;

    yShapes.observeDeep(syncContent);
    yBindings.observeDeep(syncContent);
    yAssets.observeDeep(syncContent);

    return () => {
      yShapes.unobserveDeep(syncContent);
      yBindings.unobserveDeep(syncContent);
      yAssets.unobserveDeep(syncContent);
    };
  }, [syncContent]);

  // Отключение провайдера при уходе со страницы
  useEffect(() => {
    const handleDisconnect = () => {
      roomRef.current.provider.disconnect();
    };

    window.addEventListener("beforeunload", handleDisconnect);
    return () => window.removeEventListener("beforeunload", handleDisconnect);
  }, []);

  return {
    onMount,
    onChangePage,
    onUndo,
    onRedo,
    onChangePresence,
  };
}
