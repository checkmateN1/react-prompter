import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayerTypesClientContext, requestPlayerTypes, watchPlayerType } from './playerTypesClient';
import { enumPoker } from '../../enum';
import { PlayerTypeStyleContext } from './PlayerTypeStylePreview';
import PlayerTypeIcon from './PlayerTypeIcon';
import './playerTypes.css';

const { NONE, REGULAR, FISH, RTA } = enumPoker.playerTypes;
export const PLAYER_TYPE_COLORS = { [FISH]: '#32ba69', [REGULAR]: '#3989ef', [RTA]: '#ed5353' };
const choices = [FISH, REGULAR, RTA, NONE];
const names = { [FISH]: 'Фиш', [REGULAR]: 'Рег', [RTA]: 'RTA', [NONE]: 'Без типа' };
const icons = { [FISH]: 'fish', [REGULAR]: 'regular', [RTA]: 'rta', [NONE]: 'none' };

export default function PlayerTypeNickname({ playerType, tableId, handNumber, chair, isHero, children, style,
  seatClassName, seatDetails, reportMode = false, ...props }) {
  const client = useContext(PlayerTypesClientContext);
  const control = useRef(null);
  const identity = JSON.stringify([tableId, handNumber, chair, playerType && playerType.room,
    playerType && playerType.gametype, playerType && playerType.nick]);
  // Remounting the inner control invalidates in-flight replies when a seat changes.
  const nickname = <NicknameControl key={identity} ref={control} {...props} playerType={playerType} client={client}
    reportMode={reportMode}
    tableId={tableId} handNumber={handNumber} chair={chair} isHero={isHero} style={style}>
    {children}
  </NicknameControl>;

  // Keep the seat DOM stable when incoming hand/nickname metadata remounts the control.
  return seatClassName ? <div className={seatClassName} data-player-type-priority={!reportMode}
    onDoubleClick={event => control.current.open(event)}>
    {nickname}
    {seatDetails}
  </div> : nickname;
}

const NicknameControl = forwardRef(function NicknameControl({ playerType, client, tableId, handNumber, chair,
  isHero, children, style, reportMode, pickerBackgroundColor = 'lightgrey', ...props }, ref) {
  const variant = useContext(PlayerTypeStyleContext);
  const anchor = useRef(null);
  const popup = useRef(null);
  const generation = useRef({ value: 0 }).current;
  const incomingType = playerType && playerType.type;
  const [position, setPosition] = useState(null);
  const [type, setType] = useState(incomingType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enabled = !!(client && playerType && playerType.nick && !isHero);
  const unavailable = !client ? 'Нет соединения с сервером' : '';
  const accent = !isHero && PLAYER_TYPE_COLORS[type];

  const nick = playerType?.nick;
  const room = playerType?.room;
  const gametype = playerType?.gametype;
  const version = playerType?.version;
  const handStartedAt = playerType?.handStartedAt;
  // Clock samples change on every frame; only a new hand/nick/type needs a subscription update.
  const latestServerNow = useRef(playerType?.serverNow);
  latestServerNow.current = playerType?.serverNow;
  useEffect(() => watchPlayerType(client, { tableId, handNumber, nick, room, gametype,
    type: incomingType, version, handStartedAt, serverNow: latestServerNow.current }, setType),
  [client, tableId, handNumber, nick, room, gametype, incomingType, version, handStartedAt]);
  useEffect(() => {
    setPosition(null);
    setBusy(false);
    setError('');
    return () => { generation.value++; };
  }, [client, generation]);

  useEffect(() => {
    if (reportMode) setPosition(null);
  }, [reportMode]);

  useEffect(() => {
    if (!position) return undefined;
    const close = () => setPosition(null);
    const outside = event => {
      // The portal can already be gone while React is still cleaning up this listener.
      if (!anchor.current || !popup.current) return;
      if (!anchor.current.contains(event.target) && !popup.current.contains(event.target)) close();
    };
    const keydown = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', keydown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position]);

  const request = async (event, selectedType) => {
    const current = ++generation.value;
    const isSet = selectedType !== undefined;
    if (isSet) setBusy(true);
    setError('');
    try {
      await requestPlayerTypes(client, event, {
        tableId, handNumber, chair, room: playerType.room, gametype: playerType.gametype,
        ...(isSet ? { nick: playerType.nick, type: selectedType } : { nicks: [playerType.nick] }),
      });
      if (generation.value !== current) return;
      if (isSet) setPosition(null);
    } catch (reason) {
      if (generation.value === current) setError(reason.message);
    } finally {
      if (generation.value === current) setBusy(false);
    }
  };

  const open = event => {
    if (reportMode) return;
    // A player double click belongs to the picker, even while metadata is unavailable.
    event.stopPropagation();
    if (isHero) return;
    const rect = anchor.current.getBoundingClientRect();
    const top = rect.bottom + 5;
    const height = unavailable ? 110 : 46;
    setPosition({ left: Math.max(4, Math.min(rect.left, window.innerWidth - (unavailable ? 174 : 154))),
      top: top + height < window.innerHeight ? top : Math.max(4, rect.top - height - 5) });
    // Opening the palette is a local UI action and must not depend on backend metadata.
    if (enabled && !busy) request('AdaptGetPlayersType');
  };
  useImperativeHandle(ref, () => ({ open }));

  const nickname = (
    <div {...props} ref={anchor} onDoubleClick={open}
      className={`${props.className || ''}${accent ? ' player-type-marked' : ''}`}
      data-player-style={accent ? variant : undefined}
      style={{ ...style, ...(accent ? {
        '--player-type-accent': accent,
        backgroundImage: 'none',
        ...(variant === 1 ? { boxShadow: `inset 0 0 0 1px ${accent}` } : {}),
      } : {}) }}>
      {children}
      {!reportMode && <span className="player-type-hitbox" aria-hidden="true" />}
    </div>
  );

  return <>
    {nickname}
    {position && !isHero && !reportMode && createPortal(
      <div ref={popup} className="player-type-picker" style={{ ...position, backgroundColor: pickerBackgroundColor }} role="group"
        aria-label="Тип игрока" aria-busy={busy} onDoubleClick={event => event.stopPropagation()}>
        {choices.map(value => <button key={value} type="button"
          className={`player-type-picker__option${value === NONE ? ' player-type-picker__none' : ''}`}
          style={{ color: PLAYER_TYPE_COLORS[value] || '#606060' }}
          aria-label={names[value]} title={names[value]} aria-pressed={type === value} disabled={busy || !enabled}
          onClick={() => request('AdaptSetPlayersType', value)}>
          <PlayerTypeIcon name={icons[value]} />
        </button>)}
        {(unavailable || error) && <span className="player-type-picker__error" role="alert">{unavailable || error}</span>}
      </div>, document.body)}
  </>;
});
