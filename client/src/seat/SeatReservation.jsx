import { useEffect, useMemo, useState } from 'react';
import { buildSeats, rowsForMap, findGaps, suggestSeats } from './seatLayout.js';
import './SeatReservation.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function request(path, options) {
  let res;
  try {
    res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error('Cannot reach the server. Check your connection.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

// <SeatReservation showId={4} onBooked={(result) => ...} />
export default function SeatReservation({ showId, onBooked }) {
  const [data, setData] = useState(null);       // { show, room, taken }
  const [selected, setSelected] = useState([]);
  const [group, setGroup] = useState(2);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null); // { text, bad }
  const [busy, setBusy] = useState(false);

  const seats = useMemo(() => (data ? buildSeats(data.room.total) : []), [data]);
  const taken = useMemo(() => new Set(data?.taken), [data]);
  const gaps = useMemo(() => findGaps(seats, taken, selected), [seats, taken, selected]);

  async function load(autoSelect) {
    try {
      const d = await request(`/api/shows/${showId}/seats`);
      setData(d);
      setSelected(autoSelect ? suggestSeats(buildSeats(d.room.total), new Set(d.taken), group) : []);
    } catch (e) { setMessage({ text: e.message, bad: true }); }
  }
  useEffect(() => { load(true); }, [showId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(index) {
    setMessage(null);
    setSelected((s) => (s.includes(index) ? s.filter((i) => i !== index) : [...s, index]));
  }
  function recommend(n = group) { setMessage(null); setSelected(suggestSeats(seats, taken, n)); }
  function changeGroup(n) { setGroup(n); recommend(n); }

  async function confirm() {
    setBusy(true); setMessage(null);
    try {
      const result = await request(`/api/shows/${showId}/book`, {
        method: 'POST', body: JSON.stringify({ seats: selected, email }),
      });
      await load(false);
      setMessage({ text: `Seats booked. Tickets will be sent to ${email}.` });
      onBooked?.(result);
    } catch (e) {
      if (e.status === 409) await load(true);   // someone was faster, refresh the map
      setMessage({ text: e.message, bad: true });
    } finally { setBusy(false); }
  }

  if (!data) return <p className="sr-muted">{message ? message.text : 'Loading seats…'}</p>;

  const picked = selected.map((i) => seats[i]).sort((a, b) => a.index - b.index);

  return (
    <div className="sr">
      <div className="sr-grid">
        <div>
          <div className="sr-map">
            <div className="sr-inner">
              <div className="sr-doors"><span>Entrance · door 1</span><span>Entrance · door 2</span></div>
              <div className="sr-hall"><span>Exit</span><span>Entrance hallways</span><span>Exit</span></div>

              {rowsForMap(seats).map((row) => (
                <div className="sr-row" key={row[0].row}>
                  <span className="sr-rl">{row[0].rowLabel}</span>
                  <div className="sr-seats">
                    {row.map((s) => {
                      const state = s.owner ? 'owner' : taken.has(s.index) ? 'sold' : selected.includes(s.index) ? 'selected' : 'free';
                      return (
                        <button key={s.index} type="button"
                          className={`sr-seat ${state}${s.wheelchair ? ' wc' : ''}${gaps.includes(s.index) ? ' gap' : ''}`}
                          disabled={state === 'owner' || state === 'sold'}
                          aria-label={`Row ${s.rowLabel}, seat ${s.label}${state === 'sold' ? ', taken' : ''}`}
                          onClick={() => toggle(s.index)}>
                          {s.wheelchair && state !== 'selected' ? '♿' : s.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="sr-rl">{row[0].rowLabel}</span>
                </div>
              ))}

              <div className="sr-screen">SCREEN</div>
            </div>
          </div>
          <p className="sr-legend">
            Gold outline = free · Gold = selected · Red = taken · Dashed = owner seat · ♿ = wheelchair · Red ring = single gap
          </p>
        </div>

        <aside className="sr-side">
          <h2>{data.show.title}</h2>
          <p className="sr-muted">{data.room.theater} · {data.room.name} · {data.room.total} seats</p>

          <div className="sr-party">
            Group size
            <button type="button" onClick={() => changeGroup(Math.max(1, group - 1))}>−</button>
            <b>{group}</b>
            <button type="button" onClick={() => changeGroup(Math.min(10, group + 1))}>+</button>
          </div>
          <button type="button" className="sr-btn ghost" onClick={() => recommend()}>Recommend best seats</button>

          <p>{picked.length
            ? <>Selected: <b>{picked.map((s) => `Row ${s.rowLabel} · ${s.label}`).join(', ')}</b></>
            : <span className="sr-muted">No seats selected.</span>}</p>

          {gaps.length > 0 && (
            <p className="sr-note bad">
              This leaves a single empty seat (seat {gaps.map((i) => seats[i].label).join(', ')}). You can still continue.
            </p>
          )}
          {message && <p className={`sr-note${message.bad ? ' bad' : ''}`}>{message.text}</p>}

          <label className="sr-field">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <button type="button" className="sr-btn" disabled={busy || !picked.length || !email} onClick={confirm}>
            {busy ? 'Booking…' : 'Confirm selected seats'}
          </button>
        </aside>
      </div>
    </div>
  );
}
