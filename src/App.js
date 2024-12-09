import './App.css';
import { useSession, useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react';
import DateTimePicker from 'react-datetime-picker';
import { useState } from 'react';

function App() {
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const [workStart, setWorkStart] = useState(new Date());
  const [workEnd, setWorkEnd] = useState(new Date());
  const [workEventName, setWorkEventName] = useState("");
  const [workEventDescription, setWorkEventDescription] = useState("");
  const [workEmail, setWorkEmail] = useState(null); // Secondary email
  const [workToken, setWorkToken] = useState(null); // Secondary token

  const session = useSession(); // Primary session
  const supabase = useSupabaseClient();
  const { isLoading } = useSessionContext();

  if (isLoading) return null;

  async function googleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
      },
    });
    if (error) {
      alert("Error logging in to Google provider with Supabase");
      console.log(error);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function addWorkEmail() {
    const client_id = "535143074577-nkuof0vaivorrj912apvm3mallqiemv5.apps.googleusercontent.com"; // Replace with your actual Client ID
    const redirect_uri = "https://ocdbprgmdngzgwvrkqap.supabase.co/auth/v1/callback"; // Adjust to your redirect URI

    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    );
  
    const oauthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=token&scope=${scope}&prompt=select_account`;
    const popup = window.open(oauthUrl, "_blank", "width=500,height=600");

    if (!popup) {
      alert("Popup blocked. Please allow popups in your browser.");
      return;
    }
  
    const pollTimer = setInterval(() => {
      try {
        if (popup.location && popup.location.hash) {
          const hashParams = new URLSearchParams(popup.location.hash.substring(1));
          if (hashParams.has("access_token")) {
            const accessToken = hashParams.get("access_token");
            clearInterval(pollTimer);
            popup.close();

            fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
              .then((res) => res.json())
              .then((user) => {
                if (user.email) {
                  setWorkEmail(user.email);
                  setWorkToken(accessToken);
                  alert(`Logged in as ${user.email}`);
                } else {
                  alert("Unable to fetch user email. Please try again.");
                }
              })
              .catch((error) => {
                console.error("Error fetching user info:", error);
                alert("An error occurred while fetching user information.");
              });
          }
        }
      } catch (error) {
        // Ignore cross-origin errors until the popup redirects
      }

      if (popup.closed) {
        clearInterval(pollTimer);
      }
    }, 500);
  }

  async function createCalendarEvent(token, email, eventDetails) {
    const event = {
      summary: eventDetails.name,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventDetails.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
    await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    })
      .then((res) => res.json())
      .then((data) => {
        alert(`Event created for ${email}: ${data.summary}`);
      })
      .catch((error) => {
        console.error("Error creating event:", error);
        alert("Failed to create event.");
      });
  }

  return (
    <div className="App">
      <div style={{ width: "400px", margin: "30px auto" }}>
        {session ? (
          <>
            <h2>Hey there {session.user.email}</h2>
            <p>Start of your event</p>
            <DateTimePicker onChange={setStart} value={start} />
            <p>End of your event</p>
            <DateTimePicker onChange={setEnd} value={end} />
            <p>Event name</p>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} />
            <p>Event description</p>
            <input
              type="text"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
            />
            <button
              onClick={() =>
                createCalendarEvent(session.provider_token, session.user.email, {
                  name: eventName,
                  description: eventDescription,
                  start,
                  end,
                })
              }
            >
              Create Event for Primary Email
            </button>

            {workEmail ? (
              <>
                <h2>Work Email: {workEmail}</h2>
                <p>Start of your event</p>
                <DateTimePicker onChange={setWorkStart} value={workStart} />
                <p>End of your event</p>
                <DateTimePicker onChange={setWorkEnd} value={workEnd} />
                <p>Event name</p>
                <input
                  type="text"
                  value={workEventName}
                  onChange={(e) => setWorkEventName(e.target.value)}
                />
                <p>Event description</p>
                <input
                  type="text"
                  value={workEventDescription}
                  onChange={(e) => setWorkEventDescription(e.target.value)}
                />
                <button
                  onClick={() =>
                    createCalendarEvent(workToken, workEmail, {
                      name: workEventName,
                      description: workEventDescription,
                      start: workStart,
                      end: workEnd,
                    })
                  }
                >
                  Create Event for Work Email
                </button>
              </>
            ) : (
              <button onClick={addWorkEmail}>Add Work Email</button>
            )}
            <button onClick={signOut}>Sign Out</button>
          </>
        ) : (
          <button onClick={googleSignIn}>Sign In With Google</button>
        )}
      </div>
    </div>
  );
}

export default App;
