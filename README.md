# GridFlex Local

GridFlex Local is a synthetic feeder decision-engine demo. The React UI sends scenario and resource settings to a local Node API, which returns a 24-hour forecast, dispatch, constraint checks, and measured cost comparison.

## Run Locally

```sh
npm ci
npm run dev
```

The UI runs on Vite (normally `http://localhost:5173`) and the API runs on `http://127.0.0.1:4174`. The development launcher starts both. To run only the API, use `npm run dev:api`.

## API

- `GET /api/health` reports API availability.
- `POST /api/solve` accepts `scenarioId`, `batteryEnabled`, `participationRate`, and `batteryInitialSoC`; it returns the time series, proposed actions, protection summary, strategy comparisons, and cost KPIs.
- Supported scenarios are `normal`, `cloud_event`, `evening_peak`, and `solar_surge`.

## Checks

```sh
npm test
npm run lint
npm run build
```

## Model Scope

The API runs a deterministic synthetic 30-minute feeder simulation. It allocates modeled EV/HVAC/agricultural flexibility and battery power, applies solar curtailment for reverse-flow voltage risk, then checks the resulting values against modeled thermal, voltage, battery, and participation bounds. Cost deltas use the included illustrative tariff and overload penalty assumptions.

This is not a utility-grade power-flow or MILP solver. The voltage relationship and synthetic loads are simplified; carbon and capital deferral are not estimated; operator approval is local-only and does not send DER control signals.

The simulation is illustrative and has not been validated against live feeder telemetry.
