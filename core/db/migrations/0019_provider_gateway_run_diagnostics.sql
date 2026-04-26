ALTER TABLE provider_gateway_runs
    ADD COLUMN actor_username TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_runs
    ADD COLUMN actor_home_dir TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_runs
    ADD COLUMN route_ready INTEGER NOT NULL DEFAULT 0;

ALTER TABLE provider_gateway_runs
    ADD COLUMN route_status_state TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_runs
    ADD COLUMN route_status_message TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_runs
    ADD COLUMN route_prepared INTEGER NOT NULL DEFAULT 0;

ALTER TABLE provider_gateway_runs
    ADD COLUMN route_prepare_state TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_runs
    ADD COLUMN route_prepare_message TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_runs
    ADD COLUMN resolved_binary TEXT NOT NULL DEFAULT '';

ALTER TABLE provider_gateway_runs
    ADD COLUMN base_url TEXT NOT NULL DEFAULT '';
