// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { wpsReconnectHandler } from "@/app/store/wps";
import { TabClient } from "@/app/store/tabrpcclient";
import { WshRouter } from "@/app/store/wshrouter";
import { getWSServerEndpoint } from "@/util/endpoints";
import { addWSReconnectHandler, globalWS, initGlobalWS, WSControl } from "./ws";
import { DefaultRouter, setDefaultRouter } from "./wshrpcutil-base";

let TabRpcClient: TabClient;

function initWshrpc(routeId: string): WSControl {
    const router = new WshRouter(new UpstreamWshRpcProxy());
    setDefaultRouter(router);
    const handleFn = (event: WSEventType) => {
        DefaultRouter.recvRpcMessage(event.data);
    };
    initGlobalWS(getWSServerEndpoint(), routeId, handleFn);
    globalWS.connectNow("connectWshrpc");
    TabRpcClient = new TabClient(routeId);
    DefaultRouter.registerRoute(TabRpcClient.routeId, TabRpcClient);
    addWSReconnectHandler(() => {
        DefaultRouter.reannounceRoutes();
    });
    addWSReconnectHandler(wpsReconnectHandler);
    return globalWS;
}

class CompatTabClient extends TabClient {
    override wshRpcCall(_command: string, _data: any, _opts?: RpcOpts): Promise<any> {
        return Promise.resolve(null);
    }

    override async *wshRpcStream(_command: string, _data: any, _opts?: RpcOpts): AsyncGenerator<any, void, boolean> {
        return;
    }
}

function initCompatWshrpc(routeId: string): TabClient {
    TabRpcClient = new CompatTabClient(routeId);
    return TabRpcClient;
}

class UpstreamWshRpcProxy implements AbstractWshClient {
    recvRpcMessage(msg: RpcMessage): void {
        const wsMsg: WSRpcCommand = { wscommand: "rpc", message: msg };
        globalWS?.pushMessage(wsMsg);
    }
}

export { DefaultRouter, initCompatWshrpc, initWshrpc, TabRpcClient };
export { initElectronWshrpc, sendRpcCommand, sendRpcResponse, shutdownWshrpc } from "./wshrpcutil-base";
