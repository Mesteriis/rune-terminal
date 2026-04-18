// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Modal, ModalContent, ModalFooter, ModalHeader, WaveModal } from "./RTModal.template";

function ModalDemo() {
    return (
        <div style={{ position: "relative", height: 400 }}>
            <Modal onClickOut={() => {}}>
                <ModalHeader title="Demo Modal" description="A sample description" />
                <ModalContent>
                    <p>Modal body content goes here.</p>
                </ModalContent>
                <ModalFooter>
                    <button>Cancel</button>
                    <button>Ok</button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

function WaveModalDemo() {
    return (
        <WaveModal
            title="Confirm Action"
            description="Are you sure you want to proceed?"
            onSubmit={() => {}}
            onCancel={() => {}}
            buttonLabel="Confirm"
        >
            <p>This action cannot be undone.</p>
        </WaveModal>
    );
}

export default ModalDemo;
export { WaveModalDemo };
