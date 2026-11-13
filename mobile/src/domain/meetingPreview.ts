import type { Workspace } from "./workspace";
import { meetingDay } from "./meetingTime";
export function addMeetingPreviewData(input: Workspace, now = new Date()): Workspace {
  if (input.meetingPreviewRevision === 1) return input;
  const state: Workspace = JSON.parse(JSON.stringify(input));
  const project = state.projects.find((p) => p.studentIds.includes("s1"));
  if (project) {
    const originalReview = state.meetings.find((m) => m.id === "meet1");
    if (originalReview) {
      originalReview.duration ??= 45;
      originalReview.sample ??= true;
      originalReview.projectId ??= project.id;
    }
    const day = (offset: number) => meetingDay(new Date(now.getTime() + offset * 86400000));
    const additions = [
      {
        id: "web-meeting-supervisor",
        title: "Weekly supervisor check-in",
        creatorId: "s1",
        inviteeIds: project.supervisorIds.slice(0, 1),
        date: day(4),
        time: "13:00",
        duration: 30,
        agenda: "Discuss weekly progress, open issues, and the report structure.",
        location: "Supervisor office",
        responses: {},
        cancelled: false,
        meetingType: "individual" as const,
        projectId: project.id,
        sample: true,
      },
      {
        id: "web-meeting-past",
        title: "Hardware planning session",
        creatorId: "s1",
        inviteeIds: project.studentIds.filter((id) => id !== "s1"),
        date: day(-4),
        time: "12:00",
        duration: 40,
        agenda: "Confirm the component list and divide the initial tests.",
        location: "Workshop",
        responses: {},
        cancelled: false,
        completed: true,
        meetingType: "team" as const,
        projectId: project.id,
        sample: true,
        notes:
          "Agreed to test the power supply before connecting the controller. Each teammate will document their measurements.",
      },
    ];
    for (const meeting of additions)
      if (meeting.inviteeIds.length && !state.meetings.some((m) => m.id === meeting.id))
        state.meetings.push(meeting);
  }
  state.meetingPreviewRevision = 1;
  return state;
}
