import React from "react";
import { ARENA_CATALOG, PUCK_CATALOG } from "../data/catalogs";
import { sound } from "../sound";
import {
  BentoGrid,
  BentoBox,
  ArcadeSectionHeader,
  StageCards,
  StageBtn,
  StageSwatch,
  PillRow,
  CompactPillBtn,
  PuckDot,
  OnlineBox,
  InvitePanel,
  InviteInfo,
  CodeBadge,
  CopyRow,
  CopyBtn,
  CopyStatus,
  WaitingText,
  FieldGroup,
  ArcadeInput,
} from "./StartStyles";

// Deterministic decorative matrix QR-style badge for the 4-letter invite code
function InviteQrBadge({ code }) {
  const seed = code.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const cells = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isCorner =
        (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
      const on = isCorner || ((seed >> ((r * 7 + c) % 24)) & 1) === 1;
      if (on) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c * 10 + 5}
            y={r * 10 + 5}
            width="8"
            height="8"
            rx="1.5"
            fill="#0f172a"
          />
        );
      }
    }
  }
  return (
    <svg width="76" height="76" viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" rx="10" fill="#ffffff" stroke="#0f172a" strokeWidth="4" />
      {cells}
    </svg>
  );
}

export function StageAndPuckDeck({
  gameMode,
  arena,
  puckStyle,
  aiDifficulty,
  winningScore,
  roomCode,
  onlineRole,
  joinCodeValue,
  copyStatus,
  onSelectArena,
  onSelectPuck,
  onSelectDifficulty,
  onSelectWinningScore,
  onChangeJoinCode,
  onCopyInvite,
}) {
  return (
    <>
      <BentoGrid>
        <BentoBox>
          <ArcadeSectionHeader>
            <strong>Select Arena</strong>
            <span>Stage</span>
          </ArcadeSectionHeader>
          <StageCards>
            {Object.values(ARENA_CATALOG).map((stage) => {
              const active = arena === stage.id || (arena === "smash" && stage.id === "cosmos");
              return (
                <StageBtn
                  key={stage.id}
                  type="button"
                  $active={active}
                  $accent={stage.accent}
                  $bg={stage.bg}
                  aria-pressed={active}
                  onMouseEnter={() => sound.playUiHover()}
                  onClick={() => {
                    sound.playUiClick();
                    onSelectArena(stage.id);
                  }}>
                  <StageSwatch $bg={stage.bg} $accent={stage.accent}>
                    {stage.badge}
                  </StageSwatch>
                  <div>
                    <strong>{stage.name}</strong>
                    <small>{stage.subtitle}</small>
                  </div>
                </StageBtn>
              );
            })}
          </StageCards>
        </BentoBox>

        <BentoBox>
          <ArcadeSectionHeader>
            <strong>Center Puck Skin</strong>
            <span>Shared Rink Disc Color</span>
          </ArcadeSectionHeader>
          <PillRow>
            {Object.values(PUCK_CATALOG).map((pk) => {
              const active = puckStyle === pk.id;
              return (
                <CompactPillBtn
                  key={pk.id}
                  type="button"
                  $active={active}
                  $accent={pk.main}
                  $bg="#172554"
                  aria-pressed={active}
                  onClick={() => {
                    sound.playUiClick();
                    onSelectPuck(pk.id);
                  }}>
                  <PuckDot $main={pk.main} $ring={pk.ring} />
                  {pk.name.split(" ")[0]}
                </CompactPillBtn>
              );
            })}
          </PillRow>

          {gameMode === "ai" && (
            <>
              <ArcadeSectionHeader>
                <strong>CPU Rival</strong>
              </ArcadeSectionHeader>
              <PillRow>
                {["easy", "medium", "hard"].map((lvl) => (
                  <CompactPillBtn
                    key={lvl}
                    type="button"
                    $active={aiDifficulty === lvl}
                    $accent="#fde047"
                    $bg="#ca8a04"
                    aria-pressed={aiDifficulty === lvl}
                    onClick={() => {
                      sound.playUiClick();
                      onSelectDifficulty(lvl);
                    }}>
                    {lvl === "easy" ? "Easy" : lvl === "medium" ? "Normal" : "Expert"}
                  </CompactPillBtn>
                ))}
              </PillRow>
            </>
          )}

          {gameMode !== "online" && (
            <>
              <ArcadeSectionHeader>
                <strong>Match Target</strong>
              </ArcadeSectionHeader>
              <PillRow>
                {[5, 7, 10].map((pts) => (
                  <CompactPillBtn
                    key={pts}
                    type="button"
                    $active={winningScore === pts}
                    $accent="#38bdf8"
                    $bg="#0284c7"
                    aria-pressed={winningScore === pts}
                    onClick={() => {
                      sound.playUiClick();
                      onSelectWinningScore(pts);
                    }}>
                    {pts} pts
                  </CompactPillBtn>
                ))}
              </PillRow>
            </>
          )}
        </BentoBox>
      </BentoGrid>

      {gameMode === "online" && (
        <OnlineBox>
          {roomCode && onlineRole === "host" ? (
            <InvitePanel>
              <InviteQrBadge code={roomCode} />
              <InviteInfo>
                <div>
                  ROOM CODE: <CodeBadge>{roomCode}</CodeBadge>
                </div>
                <CopyRow>
                  <CopyBtn type="button" onClick={onCopyInvite}>
                    🔗 Copy Invite Link
                  </CopyBtn>
                  <CopyStatus role="status" $visible={Boolean(copyStatus)}>
                    {copyStatus}
                  </CopyStatus>
                </CopyRow>
                <WaitingText role="status">
                  ⏳ PeerJS WebRTC Online + Instant Local / Same Wi-Fi (?room={roomCode})...
                </WaitingText>
              </InviteInfo>
            </InvitePanel>
          ) : (
            <FieldGroup>
              <label htmlFor="room-code-input">Friend Room Code (optional):</label>
              <ArcadeInput
                id="room-code-input"
                type="text"
                placeholder="e.g. K7MX"
                value={joinCodeValue}
                onChange={(e) => onChangeJoinCode(e.target.value.toUpperCase())}
                maxLength="6"
              />
            </FieldGroup>
          )}
        </OnlineBox>
      )}
    </>
  );
}
