// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/ui/primitives/RTButton";
import React from "react";

import "./RTModal.style.scss";
import type { ModalContentProps, ModalFooterProps, ModalHeaderProps, ModalProps, WaveModalProps } from "./RTModal.logic";

function Modal({ children, onClickOut, id = "modal", ...otherProps }: ModalProps) {
    const handleOutsideClick = (e: React.SyntheticEvent<HTMLDivElement>) => {
        if (typeof onClickOut === "function" && (e.target as Element).className === "modal-container") {
            onClickOut();
        }
    };

    return (
        <div className="modal-container" onClick={handleOutsideClick}>
            <dialog {...otherProps} id={id} className="modal">
                {children}
            </dialog>
        </div>
    );
}

function ModalContent({ children }: ModalContentProps) {
    return <div className="modal-content">{children}</div>;
}

function ModalHeader({ title, description }: ModalHeaderProps) {
    return (
        <header className="modal-header">
            {typeof title === "string" ? <h3 className="modal-title">{title}</h3> : title}
            {description && <p>{description}</p>}
        </header>
    );
}

function ModalFooter({ children }: ModalFooterProps) {
    return <footer className="modal-footer">{children}</footer>;
}

function WaveModal({ title, description, onSubmit, onCancel, buttonLabel = "Ok", children }: WaveModalProps) {
    return (
        <Modal onClickOut={onCancel}>
            <ModalHeader title={title} description={description} />
            <ModalContent>{children}</ModalContent>
            <ModalFooter>
                <Button onClick={onSubmit}>{buttonLabel}</Button>
            </ModalFooter>
        </Modal>
    );
}

export { Modal, ModalContent, ModalFooter, ModalHeader, WaveModal };
