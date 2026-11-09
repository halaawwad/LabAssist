import { calendarDay, type Workspace } from "./workspace";

/** Add illustrative records once; never replace the user's existing edits. */
export function addPreviewData(input: Workspace, now = new Date()): Workspace {
  if (input.previewDataRevision === 1) return input;
  const state: Workspace = JSON.parse(JSON.stringify(input));
  const day = (offset: number) => calendarDay(new Date(now.getTime() + offset * 86400000));
  const stamp = (offset: number) => new Date(now.getTime() + offset * 60000).toISOString();
  const add = <T extends { id: string }>(list: T[], value: T) => {
    if (!list.some((x) => x.id === value.id)) list.push(value);
  };
  state.projects.forEach((p, index) => {
    p.studentIds.forEach((ownerId, i) => {
      [
        ["Calibrate the distance sensor", true],
        ["Document the circuit connections", true],
        ["Test motor response under load", false],
        ["Prepare the next weekly report", false],
      ].forEach(([title, done], j) =>
        add(state.tasks, {
          id: `preview-${p.id}-${ownerId}-${j}`,
          projectId: p.id,
          ownerId,
          title: String(title),
          done: Boolean(done),
          dueDate: day(j === 2 ? -1 : j),
          createdAt: stamp(-1440 * (j + 1)),
        }),
      );
      const user = state.users.find((u) => u.id === ownerId);
      if (user && user.name.startsWith("Student "))
        user.name =
          [
            "Sara Khaled",
            "Omar Hasan",
            "Lina Nasser",
            "Ahmad Mansour",
            "Rana Saleh",
            "Yousef Ali",
            "Maya Jaber",
            "Tareq Awad",
          ][(index * 3 + i) % 8] +
          " " +
          (index + 1);
    });
    add(state.issues, {
      id: `preview-issue-${p.id}`,
      projectId: p.id,
      title: "Motor readings fluctuate during the full drive test",
      resolved: false,
    });
    [
      ["L298N Motor Driver", 1, 22, "obtained"],
      ["Breadboard", 1, 15, "obtained"],
      ["Jumper wires", 20, 1, "obtained"],
      ["18650 battery holder", 1, 10, "needed"],
      ["Spare light sensor", 1, 8, "unused"],
    ].forEach(([name, quantity, unitPrice, status], i) =>
      add(state.parts, {
        id: `preview-part-${p.id}-${i}`,
        projectId: p.id,
        name: String(name),
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        status: status as "obtained" | "needed" | "unused",
      }),
    );
    add(state.expenses, {
      id: `preview-expense-${p.id}`,
      projectId: p.id,
      title: "Motor driver and prototyping materials",
      amount: 57,
    });
    const thread = state.threads.find((x) => x.projectId === p.id);
    if (thread) {
      const lines = [
        "I finished the sensor calibration. The latest measurements are in the weekly report.",
        "Great. I will check the wiring diagram before our meeting.",
        "Please include the test conditions and the remaining issues.",
      ];
      lines.forEach((body, i) =>
        add(state.messages, {
          id: `preview-message-${p.id}-${i}`,
          threadId: thread.id,
          senderId: i === 2 ? p.supervisorIds[0] : p.studentIds[i % p.studentIds.length],
          body,
          createdAt: stamp(-45 + i * 12),
          starredBy: i === 0 ? [p.studentIds[0]] : [],
          seenBy: [p.studentIds[0]],
        }),
      );
    }
    add(state.meetings, {
      id: `preview-meeting-${p.id}`,
      title: "Weekly progress & circuit review",
      creatorId: p.supervisorIds[0],
      inviteeIds: p.studentIds,
      date: day(2),
      time: "11:30",
      agenda: "Sensor calibration results, motor tests, current blockers, and next week’s plan.",
      location: "Engineering workshop — table " + p.table,
      responses: { [p.studentIds[0]]: "accepted" },
      cancelled: false,
    });
    const final = state.reports.find((x) => x.projectId === p.id && x.kind === "final");
    if (final && Object.values(final.fields).every((x) => !x.trim()))
      final.fields = {
        Abstract:
          "This project presents an autonomous vehicle prototype that detects nearby obstacles and adjusts its motion using ultrasonic measurements.",
        Introduction:
          "The team is developing a low-cost autonomous navigation prototype for indoor environments. The main objective is to combine reliable sensing, motor control, and a clear testing process.",
        "Theoretical Background":
          "Ultrasonic sensors estimate distance from the time of flight of reflected sound waves. A motor driver interfaces the controller with the DC motors.",
        Methodology:
          "The prototype uses a microcontroller, distance sensor, motor driver and battery supply. Each subsystem is tested separately before integration.",
        Results:
          "Initial tests confirmed obstacle detection. Motor response still requires calibration under load.",
        Conclusion:
          "The current prototype demonstrates the main concept. Further work focuses on repeatability, power stability, and integration tests.",
        References: "Component manufacturer documentation and the team’s recorded experiments.",
      };
    const deck = state.reports.find((x) => x.projectId === p.id && x.kind === "presentation");
    if (deck && Object.values(deck.fields).every((x) => !x.trim()))
      deck.fields = {
        "Project overview": p.title + " — " + p.description,
        "Problem and objectives":
          "Reliable obstacle detection and controlled motion in a compact, affordable prototype.",
        "Our solution":
          "A microcontroller combines ultrasonic measurements with motor-driver control.",
        Results: "Sensor calibration completed; full-drive testing is in progress.",
        "Next steps":
          "Repeat tests under different lighting and load conditions, document results, and finalize the enclosure.",
      };
    add(state.reports, {
      id: `preview-week2-${p.id}`,
      projectId: p.id,
      kind: "weekly",
      week: 2,
      status: "draft",
      fields: {
        completed: "Calibrated the ultrasonic sensor and assembled the motor-driver circuit.",
        progress: "The prototype detects obstacles reliably at short range.",
        tasks: "Sensor calibration; wiring review; motor-driver assembly.",
        delays: "One motor responds more slowly under load.",
        problems: "Battery voltage drops during simultaneous motor startup.",
        plan: "Test a separate power supply and repeat the full drive cycle.",
      },
      template: "minimal",
      color: "#526443",
      openedBy: [],
      feedback: [],
    });
    const weekly = state.reports.find(
      (x) => x.projectId === p.id && x.kind === "weekly" && x.status === "submitted",
    );
    if (weekly && !weekly.feedback.length) {
      weekly.status = "reviewed";
      weekly.openedBy = [p.supervisorIds[0]];
      weekly.feedback.push({
        id: `preview-feedback-${p.id}`,
        authorId: p.supervisorIds[0],
        body: "Clear progress. Add a photo of the wiring and include the measured voltage in next week’s report.",
        section: "Completed work",
        createdAt: stamp(-120),
      });
    }
  });
  const p = state.projects[0];
  if (p) {
    add(state.messages, {
      id: "preview-self-note",
      threadId: `self-${p.studentIds[0]}`,
      senderId: p.studentIds[0],
      body: "Remember to attach the updated circuit diagram before the review.",
      createdAt: stamp(-10),
      starredBy: [p.studentIds[0]],
    });
  }
  add(state.notices, {
    id: "preview-workshop-notice",
    authorId: "w1",
    body: "The workshop is open today. Check your assigned table and return borrowed tools after the testing session.",
    supervisors: true,
    seenBy: [],
    createdAt: stamp(-60),
    kind: "notice",
  });
  state.users.forEach((user, i) => {
    add(state.alerts, {
      id: `preview-alert-${user.id}`,
      userId: user.id,
      body:
        user.role === "student"
          ? "Your supervisor left feedback on the weekly report."
          : user.role === "supervisor"
            ? "New project updates are ready for review."
            : "Teams are preparing today’s testing sessions.",
      read: false,
    });
    if (user.role === "student") {
      state.attendance[day(0)] ??= {};
      if (!(user.id in state.attendance[day(0)])) state.attendance[day(0)][user.id] = i % 7 !== 0;
    }
  });
  state.previewDataRevision = 1;
  return state;
}
