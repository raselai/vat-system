import { Tooltip } from 'antd';
import { D } from '../styles/design';

/**
 * Small info icon with a plain-language tooltip — placed next to tax jargon
 * (Output VAT, Input Credit, BIN, VDS rate, etc.) so owners understand the term
 * without hiding the jargon the accountant relies on.
 */
export default function InfoTip({ text, size = 15 }: { text: string; size?: number }) {
  return (
    <Tooltip title={text}>
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: size,
          color: D.onSurfaceVar,
          cursor: 'help',
          verticalAlign: 'middle',
          marginLeft: 4,
          userSelect: 'none',
        }}
      >
        help
      </span>
    </Tooltip>
  );
}
