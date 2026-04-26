ALTER TABLE provider_gateway_runs
    ADD COLUMN first_response_latency_ms INTEGER NOT NULL DEFAULT 0;

ALTER TABLE provider_gateway_probes
    ADD COLUMN prepared INTEGER NOT NULL DEFAULT 0;

ALTER TABLE provider_gateway_probes
    ADD COLUMN prepare_state TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_probes
    ADD COLUMN prepare_message TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_probes
    ADD COLUMN prepare_latency_ms INTEGER NOT NULL DEFAULT 0;

ALTER TABLE provider_gateway_probes
    ADD COLUMN prepared_at TEXT NOT NULL DEFAULT '';
