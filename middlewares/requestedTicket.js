import { PrismaClient } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

const prisma = new PrismaClient();

export const checkSlotAndLimit = async (req, res, next) => {
  const { date, slot, requestedTickets } = req.body;

  console.log("Received data:", { date, slot, requestedTickets }); // Debug log

  if (!date || !slot || !requestedTickets) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  if (requestedTickets > 9) {
    return res
      .status(400)
      .json(new ApiError(400, "You can only book up to 9 tickets"));
  }

  try {
    // ✅ Better date parsing
    const parsedDate = new Date(date);
    parsedDate.setHours(0, 0, 0, 0); // Set time to start of day
    
    console.log("Parsed date:", parsedDate); // Debug log
    console.log("Looking for slot:", slot); // Debug log

    let slotEntry = await prisma.slotAvailability.findFirst({
      where: {
        date: parsedDate,
        slot: slot,
      },
    });

    console.log("Found slot entry:", slotEntry); // Debug log

    if (!slotEntry) {
      // Create slot on-the-fly with full availability
      console.log("Creating new slot entry..."); // Debug log
      
      slotEntry = await prisma.slotAvailability.create({
        data: {
          date: parsedDate,
          slot,
          remaining: 18,
        },
      });
      
      console.log("Created slot entry:", slotEntry); // Debug log
    }

    if (requestedTickets > slotEntry.remaining) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Only ${slotEntry.remaining} tickets left for this slot`
          )
        );
    }

    // attach for next handler to use
    req.slotEntry = slotEntry;
    next();
    
  } catch (error) {
    console.error("Middleware error:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error checking slot availability"));
  }
};