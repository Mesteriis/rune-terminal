// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * RTInput Story
 *
 * Static demo of Input components in various states and configurations.
 */

import { Input, InputGroup, InputLeftElement, InputRightElement } from "./RTInput.template";

export default function InputStory() {
  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "400px" }}>
      <div>
        <h3>Basic Input</h3>
        <Input placeholder="Enter text..." />
      </div>

      <div>
        <h3>With Default Value</h3>
        <Input defaultValue="Default text" />
      </div>

      <div>
        <h3>Input Group with Left Element</h3>
        <InputGroup>
          <InputLeftElement>
            <span style={{ fontSize: "12px" }}>🔍</span>
          </InputLeftElement>
          <Input placeholder="Search..." />
        </InputGroup>
      </div>

      <div>
        <h3>Input Group with Right Element</h3>
        <InputGroup>
          <Input placeholder="Password" />
          <InputRightElement>
            <span style={{ fontSize: "12px" }}>👁️</span>
          </InputRightElement>
        </InputGroup>
      </div>

      <div>
        <h3>Number Input</h3>
        <Input isNumber placeholder="Enter numbers only..." />
      </div>

      <div>
        <h3>Disabled Input</h3>
        <Input disabled placeholder="Disabled..." />
      </div>

      <div>
        <h3>With Max Length</h3>
        <Input maxLength={10} placeholder="Max 10 chars" />
      </div>
    </div>
  );
}

export function InputVariants() {
  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px", maxWidth: "400px" }}>
      <Input placeholder="Text input" />
      <InputGroup>
        <InputLeftElement>📧</InputLeftElement>
        <Input placeholder="Email" />
      </InputGroup>
      <Input isNumber placeholder="Number only" />
      <Input disabled placeholder="Disabled state" />
      <Input maxLength={20} placeholder="Max 20 characters" />
    </div>
  );
}
