"use client";

import { type PointerEvent } from "react";
import type { LaidOutNode, Person } from "../types";

interface NodeProps {
  node: LaidOutNode;
  person: Person;
  selected: boolean;
  isViewRoot: boolean;
  relation: string | null;
  onSelect: (id: string) => void;
}

export function Node({
  node,
  person,
  selected,
  isViewRoot,
  relation,
  onSelect,
}: NodeProps) {
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
  }

  function handleClick() {
    onSelect(person.id);
  }

  const subtitle = isViewRoot ? "you" : relation;

  return (
    <div
      className={[
        "absolute flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 px-3 py-2 text-center transition-colors",
        selected
          ? "border-brand-orange bg-surface-elevated"
          : isViewRoot
            ? "border-brand-blue bg-surface-tertiary hover:border-brand-pink"
            : "border-border-default bg-surface-secondary hover:border-border-hover",
      ].join(" ")}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <span className="text-sm font-medium text-text-primary leading-tight">
        {person.name}
      </span>
      {subtitle !== null ? (
        <span
          className={[
            "mt-1 text-xs leading-tight",
            isViewRoot ? "text-brand-blue" : "text-text-muted",
          ].join(" ")}
        >
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}
