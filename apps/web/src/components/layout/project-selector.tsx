"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selectProjectAction } from "@/lib/actions/select-project-action";

export type ProjectOption = {
  id: string;
  name: string;
  domain: string;
};

interface ProjectSelectorProps {
  projects: ProjectOption[];
  selectedProjectId: string | null;
  workspaceId: string;
  workspaceSlug: string;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  workspaceId,
  workspaceSlug,
}: Readonly<ProjectSelectorProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selected = projects.find((p) => p.id === selectedProjectId);

  if (projects.length === 0) return null;

  const handleSelect = (projectId: string) => {
    if (projectId === selectedProjectId) return;
    startTransition(async () => {
      await selectProjectAction(workspaceId, projectId, workspaceSlug);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="border-border hover:bg-secondary/80 inline-flex h-8 max-w-[200px] items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm transition-colors disabled:opacity-50"
        >
          <FolderOpen className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate font-medium">
            {selected?.name ?? "Select project"}
          </span>
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Switch project
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onSelect={() => handleSelect(project.id)}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{project.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {project.domain}
              </div>
            </div>
            {project.id === selectedProjectId && (
              <Check className="text-primary h-3.5 w-3.5 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
