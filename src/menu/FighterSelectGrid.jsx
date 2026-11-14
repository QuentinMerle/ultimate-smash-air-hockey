import React from "react";
import { STRIKER_CATALOG } from "../data/catalogs";
import { sound } from "../sound";
import {
  ArcadeSectionHeader,
  FighterGrid,
  FighterCard,
  StrikerDisc,
  FighterName,
  FighterRole,
  SuperPill,
  StatRows,
  StatRow,
  StatBarTrack,
  StatBarFill,
  PillRow,
  CompactPillBtn,
} from "./StartStyles";

export function FighterSelectGrid({
  gameMode,
  playerOneStriker,
  playerTwoStriker,
  onSelectP1,
  onSelectP2,
}) {
  const fighters = Object.values(STRIKER_CATALOG);

  return (
    <>
      <ArcadeSectionHeader>
        <strong>Choose Your Fighter</strong>
        <span>Your Mallet, Stats &amp; Super</span>
      </ArcadeSectionHeader>

      <FighterGrid>
        {fighters.map((f) => {
          const isActive = playerOneStriker === f.id;
          return (
            <FighterCard
              key={f.id}
              type="button"
              $active={isActive}
              $accent={f.color}
              aria-pressed={isActive}
              onMouseEnter={() => sound.playUiHover()}
              onClick={() => {
                sound.playUiClick();
                onSelectP1(f.id);
              }}>
              <StrikerDisc $color={f.color} $ring={f.ring}>
                <span aria-hidden="true">{f.icon}</span>
              </StrikerDisc>
              <FighterName>{f.name}</FighterName>
              <FighterRole>{f.title}</FighterRole>
              <SuperPill $color={f.color} title={f.superMove.desc}>
                {f.superMove.icon} {f.superMove.name}
              </SuperPill>
              <StatRows>
                <StatRow>
                  <span>PWR</span>
                  <StatBarTrack>
                    <StatBarFill $pct={(f.stats.pwr / 5) * 100} $color="#ff2a54" />
                  </StatBarTrack>
                </StatRow>
                <StatRow>
                  <span>SPD</span>
                  <StatBarTrack>
                    <StatBarFill $pct={(f.stats.spd / 5) * 100} $color="#38bdf8" />
                  </StatBarTrack>
                </StatRow>
                <StatRow>
                  <span>FX</span>
                  <StatBarTrack>
                    <StatBarFill $pct={(f.stats.fx / 5) * 100} $color="#fde047" />
                  </StatBarTrack>
                </StatRow>
              </StatRows>
            </FighterCard>
          );
        })}
      </FighterGrid>

      {gameMode === "local" && (
        <>
          <ArcadeSectionHeader>
            <strong>Player 2 Fighter</strong>
            <span>Right Goal Striker</span>
          </ArcadeSectionHeader>
          <PillRow>
            {fighters.map((f) => (
              <CompactPillBtn
                key={`p2-${f.id}`}
                type="button"
                $active={playerTwoStriker === f.id}
                $accent={f.ring}
                $bg={f.color}
                aria-pressed={playerTwoStriker === f.id}
                onClick={() => {
                  sound.playUiClick();
                  onSelectP2(f.id);
                }}>
                {f.icon} {f.name}
              </CompactPillBtn>
            ))}
          </PillRow>
        </>
      )}
    </>
  );
}
