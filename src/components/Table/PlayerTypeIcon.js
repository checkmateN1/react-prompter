import React, { useRef } from 'react';

const sheet = new URL(`${process.env.PUBLIC_URL || '.'}/player_types_icons.png`, document.baseURI).href;
// Exact source rectangles in the supplied 2172 x 724 PNG, including a small edge allowance.
const crops = {
  fish: [505, 309, 223, 126],
  regular: [1185, 267, 181, 202],
  rta: [857, 291, 189, 168],
  none: [1521, 302, 145, 142],
};
let nextId = 0;

export default function PlayerTypeIcon({ name }) {
  const id = useRef(null);
  if (!id.current) id.current = `player-type-icon-tint-${++nextId}`;
  const [x, y, width, height] = crops[name];
  return <svg className={`player-type-icon player-type-icon--${name}`}
    viewBox={`${x} ${y} ${width} ${height}`} aria-hidden="true" focusable="false">
    <defs>
      <filter id={id.current} x={x} y={y} width={width} height={height}
        filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodColor="currentColor" />
        <feComposite in2="SourceAlpha" operator="in" />
      </filter>
    </defs>
    <image href={sheet} width="2172" height="724" filter={`url(#${id.current})`} />
  </svg>;
}
