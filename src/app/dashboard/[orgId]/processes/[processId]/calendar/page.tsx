"use client";
import React from 'react'
import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";


const Calendar = () => {
  const [events, setEvents] = useState([
    { id: "1", title: "Meeting", start: "2025-11-26T10:00:00", end: "2025-11-26T11:00:00" },
    { id: "2", title: "Task Review", start: "2025-11-27T14:00:00", end: "2025-11-27T15:00:00" },
  ]);
  const handleEventClick = (info: any) => {
    alert(`Event clicked: ${info.event.title}`);
    // You can navigate, open modal, edit task, etc.
  };

  return (
    <>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>
    </>
  )
}

export default Calendar