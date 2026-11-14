import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { useStore } from "../store";
import {
  BONUS_CATALOG,
  STRIKER_CATALOG,
  activatePlayerBonus,
} from "../utils";
import { sound } from "../sound";
import { sendGuestInput } from "../net";

function ItemSlot({
  player,
  item,
  playerName,
  accentColor,
  hintText,
  canClick,
  onActivate,
}) {
  const [rollIndex, setRollIndex] = useState(0);

  useEffect(() => {
    if (item.status !== "rolling") return;
    const interval = setInterval(() => {
      setRollIndex((i) => {
        const next = (i + 1) % BONUS_CATALOG.length;
        if (player === "playerOne") {
          sound.playRouletteTick(next);
        }
        return next;
      });
    }, 85);
    return () => clearInterval(interval);
  }, [item.status, player]);

  const displayedBonus =
    item.status === "rolling"
      ? BONUS_CATALOG[rollIndex]
      : item.status === "ready"
      ? item.bonus
      : null;

  return (
    <SlotContainer $side={player === "playerOne" ? "left" : "right"}>
      <PlayerTag $accent={accentColor}>{playerName}</PlayerTag>
      <ItemFrame
        type="button"
        disabled={!canClick || item.status !== "ready"}
        aria-label={
          displayedBonus
            ? `${playerName} item: ${displayedBonus.name}`
            : `${playerName} empty item slot`
        }
        $status={item.status}
        $color={displayedBonus?.color || accentColor}
        $interactive={canClick && item.status === "ready"}
        onClick={onActivate}>
        {item.status === "none" && <EmptyIcon>?</EmptyIcon>}
        {displayedBonus && (
          <>
            <BonusIcon>{displayedBonus.icon}</BonusIcon>
            <BonusName>{displayedBonus.name}</BonusName>
            {item.status === "ready" && (
              <BonusDesc>{displayedBonus.description}</BonusDesc>
            )}
          </>
        )}
      </ItemFrame>
      {item.status === "ready" && hintText && (
        <ActionHint>{hintText}</ActionHint>
      )}
    </SlotContainer>
  );
}

export function Gift() {
  const startGame = useStore((state) => state.startGame);
  const endGame = useStore((state) => state.endGame);
  const gameMode = useStore((state) => state.gameMode);
  const onlineRole = useStore((state) => state.onlineRole);
  const playerOneName = useStore((state) => state.playerOneName);
  const playerTwoName = useStore((state) => state.playerTwoName);
  const playerOneItem = useStore((state) => state.playerOneItem);
  const playerTwoItem = useStore((state) => state.playerTwoItem);
  const playerOneRocketArmed = useStore((state) => state.playerOneRocketArmed);
  const playerTwoRocketArmed = useStore((state) => state.playerTwoRocketArmed);
  const activeEffects = useStore((state) => state.activeEffects);
  const countdown = useStore((state) => state.countdown);
  const isPaused = useStore((state) => state.isPaused);
  const isGoalSlowMo = useStore((state) => state.isGoalSlowMo);
  const playerOneStriker = useStore((state) => state.playerOneStriker);
  const playerTwoStriker = useStore((state) => state.playerTwoStriker);

  if (!startGame || endGame) return null;

  const isGuest = gameMode === "online" && onlineRole === "guest";
  const armedStriker = playerOneRocketArmed
    ? STRIKER_CATALOG[playerOneStriker] || STRIKER_CATALOG.blaze
    : playerTwoRocketArmed
    ? STRIKER_CATALOG[playerTwoStriker] || STRIKER_CATALOG.frost
    : null;

  return (
    <>
      {countdown !== null && (
        <CountdownOverlay key={countdown} $isGo={countdown === "GO!"}>
          {countdown}
        </CountdownOverlay>
      )}

      {armedStriker && !isGoalSlowMo && (
        <RocketAlert role="status">
          {armedStriker.superMove.icon} {armedStriker.superMove.name.toUpperCase()} ARMED! STRIKE THE PUCK!
        </RocketAlert>
      )}

      <ItemSlot
        player="playerOne"
        item={playerOneItem}
        playerName={playerOneName}
        accentColor="#ff2a54"
        hintText={isGuest ? "HOST" : "CLICK / SPACE / A"}
        canClick={!isGuest}
        onActivate={() => !isGuest && activatePlayerBonus("playerOne")}
      />

      <ItemSlot
        player="playerTwo"
        item={playerTwoItem}
        playerName={playerTwoName}
        accentColor="#00b4d8"
        hintText={
          gameMode === "local"
            ? "SHIFT / E / PAD 2"
            : isGuest
            ? "CLICK / SPACE / A"
            : gameMode === "online"
            ? "CHALLENGER"
            : "AUTO CPU"
        }
        canClick={gameMode === "local" || isGuest}
        onActivate={() => {
          if (gameMode === "local") {
            activatePlayerBonus("playerTwo");
          } else if (isGuest) {
            sendGuestInput(0, 2.1, true);
          }
        }}
      />

      {activeEffects.length > 0 && !isGoalSlowMo && (
        <ActiveEffectsBar>
          {activeEffects.map((eff) => (
            <EffectBadge key={eff.id} $color={eff.bonus.color}>
              <EffectTopRow>
                <span>{eff.bonus.icon}</span>
                <div>
                  <strong>{eff.bonus.name}</strong>
                  <small>
                    {eff.player === "playerOne" ? playerOneName : playerTwoName}
                  </small>
                </div>
              </EffectTopRow>
              <TimerTrack>
                <TimerFill
                  $color={eff.bonus.color}
                  $duration={eff.bonus.duration}
                  $paused={isPaused}
                />
              </TimerTrack>
            </EffectBadge>
          ))}
        </ActiveEffectsBar>
      )}
    </>
  );
}

const pulse = keyframes`
  0%, 100% { transform: scale(1) rotate(-1deg); }
  50% { transform: scale(1.07) rotate(1deg); }
`;

const spinPop = keyframes`
  0% { transform: translateY(-8px) scale(0.85); opacity: 0.7; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`;

const countdownPop = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 0; }
  45% { transform: translate(-50%, -50%) scale(1.18) rotate(3deg); opacity: 1; }
  80% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
`;

const shrinkBar = keyframes`
  0% { transform: scaleX(1); }
  100% { transform: scaleX(0); }
`;

const CountdownOverlay = styled.div`
  position: fixed;
  z-index: 95;
  top: 48%;
  left: 50%;
  font-family: "RussoOne", sans-serif;
  font-size: ${({ $isGo }) => ($isGo ? "7.5rem" : "6.5rem")};
  font-style: italic;
  color: ${({ $isGo }) => ($isGo ? "#4ade80" : "#fde047")};
  -webkit-text-stroke: 5px #0f172a;
  text-shadow: 0 8px 0 #0f172a;
  pointer-events: none;
  user-select: none;
  animation: ${countdownPop} 0.72s ease-out forwards;
`;

const RocketAlert = styled.div`
  position: fixed;
  z-index: 89;
  top: 175px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 18px;
  border-radius: 999px;
  background: #ff0055;
  color: #fde047;
  font-family: "RussoOne", sans-serif;
  font-size: 0.88rem;
  border: 3px solid #0f172a;
  box-shadow: 0 4px 0 #0f172a;
  pointer-events: none;
  white-space: nowrap;
`;

const SlotContainer = styled.div`
  position: fixed;
  z-index: 88;
  bottom: 54px;
  ${({ $side }) => ($side === "left" ? "left: 24px;" : "right: 24px;")}
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: "RussoOne", sans-serif;
  user-select: none;

  @media only screen and (max-width: 640px) {
    bottom: max(54px, calc(env(safe-area-inset-bottom, 12px) + 44px));
    ${({ $side }) => ($side === "left" ? "left: 16px;" : "right: 16px;")}
    gap: 5px;
  }
`;

const PlayerTag = styled.div`
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 999px;
  background: ${({ $accent }) => $accent};
  color: #ffffff;
  border: 3px solid #0f172a;
  box-shadow: 0 3px 0 #0f172a;

  @media only screen and (max-width: 640px) {
    font-size: 0.68rem;
    padding: 3px 9px;
  }
`;

const ItemFrame = styled.button`
  width: 122px;
  min-height: 118px;
  padding: 10px 8px;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: inherit;
  cursor: ${({ $interactive }) => ($interactive ? "pointer" : "default")};
  background: ${({ $status }) =>
    $status === "ready" ? "#1e293b" : "rgba(15, 23, 42, 0.9)"};
  border: 4px solid #0f172a;
  outline: 3px solid
    ${({ $status, $color }) =>
      $status === "ready"
        ? $color
        : $status === "rolling"
        ? "#fde047"
        : "transparent"};
  box-shadow: 0 6px 0 #0f172a;
  animation: ${({ $status }) => ($status === "ready" ? pulse : "none")} 1s
    infinite ease-in-out;

  @media only screen and (max-width: 640px) {
    width: 96px;
    min-height: 88px;
    padding: 6px;
    border-radius: 16px;
  }
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  color: #fde047;
  -webkit-text-stroke: 2px #0f172a;
  opacity: 0.45;
`;

const BonusIcon = styled.div`
  font-size: 2.6rem;
  line-height: 1.1;
  animation: ${spinPop} 0.08s ease-out;

  @media only screen and (max-width: 640px) {
    font-size: 1.9rem;
  }
`;

const BonusName = styled.div`
  margin-top: 4px;
  font-size: 0.78rem;
  color: #fde047;
  text-transform: uppercase;

  @media only screen and (max-width: 640px) {
    font-size: 0.68rem;
  }
`;

const BonusDesc = styled.div`
  margin-top: 2px;
  font-family: system-ui, sans-serif;
  font-weight: 700;
  font-size: 0.66rem;
  color: #f8fafc;

  @media only screen and (max-width: 640px) {
    font-size: 0.58rem;
  }
`;

const ActionHint = styled.div`
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 8px;
  background: #fde047;
  color: #0f172a;
  border: 2px solid #0f172a;
  box-shadow: 0 3px 0 #0f172a;

  @media only screen and (max-width: 640px) {
    font-size: 0.6rem;
    padding: 3px 7px;
  }
`;

const ActiveEffectsBar = styled.div`
  position: fixed;
  z-index: 88;
  top: 108px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  pointer-events: none;
`;

const EffectBadge = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 6px 14px 8px;
  border-radius: 16px;
  background: #1e293b;
  border: 3px solid #0f172a;
  outline: 2px solid ${({ $color }) => $color};
  color: #ffffff;
  font-family: "RussoOne", sans-serif;
  font-size: 0.78rem;
  box-shadow: 0 4px 0 #0f172a;
`;

const EffectTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    font-size: 1.25rem;
  }

  div {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  small {
    font-family: system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    color: #fde047;
  }
`;

const TimerTrack = styled.div`
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
`;

const TimerFill = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ $color }) => $color};
  transform-origin: left center;
  animation: ${shrinkBar} ${({ $duration }) => $duration}ms linear forwards;
  animation-play-state: ${({ $paused }) => ($paused ? "paused" : "running")};
`;
