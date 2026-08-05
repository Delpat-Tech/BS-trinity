import dbConnect from "@/lib/db";
import { LeaveEntry } from "@/models/LeaveEntry";
import { Employee } from "@/models/Employee";
import LeaveApprovalsClient from "./LeaveApprovalsClient";

export const dynamic = "force-dynamic";

export default async function LeaveApprovalsPage() {
  await dbConnect();

  // Aggregate leave entries with employee details
  const leaves = await LeaveEntry.aggregate([
    { $sort: { date: -1, createdAt: -1 } },
    {
      $lookup: {
        from: "employees",
        localField: "employeeId",
        foreignField: "machineId",
        as: "emp",
      },
    },
    {
      $unwind: {
        path: "$emp",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "loggedBy",
        foreignField: "_id",
        as: "loggedByUser",
      },
    },
    {
      $unwind: {
        path: "$loggedByUser",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  // Convert BSON objects to plain JSON for client component
  const serialized = leaves.map((l) => ({
    _id: l._id.toString(),
    employeeId: l.employeeId,
    date: l.date,
    kind: l.kind,
    status: l.status || "pending",
    note: l.note || "",
    loggedAt: l.loggedAt ? l.loggedAt.toISOString() : "",
    rejectionReason: l.rejectionReason || "",
    emp: l.emp
      ? {
          name: l.emp.name,
          machineId: l.emp.machineId,
          phone: l.emp.phone || "",
        }
      : undefined,
    loggedByUser: l.loggedByUser
      ? {
          username: l.loggedByUser.username,
        }
      : undefined,
  }));

  return (
    <div className="px-[32px] pt-[28px] pb-[32px]">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight text-text">
          Leave Approvals
        </h1>
        <div className="text-[13.5px] text-text-secondary mt-1">
          Review, approve, modify, or reject employee leave requests.
        </div>
      </div>

      <LeaveApprovalsClient leaves={serialized} />
    </div>
  );
}
