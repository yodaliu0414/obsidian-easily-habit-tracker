# **Easily Habit Tracker for Obsidian**

A flexible and powerful plugin for tracking habits directly within your periodic (daily, weekly, monthly) notes and visualizing your progress with highly customizable, interactive views.

## **Features**

* ✅ **Inline Habit Tracking:** Track habits directly in your notes using four different interactive types:  
  * **Checks:** Simple multi-checkboxes for binary tasks.  
  * **Ratings:** Star ratings for subjective measures.  
  * **Numbers:** Track values against a target (e.g., pages read, minutes exercised).  
  * **Progress:** A simple slider for percentage-based tasks.  
* 🎨 **Powerful Block Rendering:** Use a habit-tracker code block to generate beautiful visualizations of your habit data.  
  * **Monthly Calendar View:** A compact, GitHub-style calendar for each habit.  
  * **Yearly Calendar View:** A full-year contribution graph for a high-level overview.  
  * **Weekly List View:** A clean, row-based view of your habits for the week.  
* ⚙️ **Highly Customizable:**  
  * Define custom icons and colors for each habit in its own note.  
  * Set global default icons for a consistent look.  
  * Interactive controls on rendered blocks to change layout and icon shapes on the fly.  
* 🚀 **Streamlined Workflow:**  
  * Insert habit trackers quickly using the command palette or the right-click context menu.  
  * Intelligent modals that can pre-fill settings based on the habit link in the current line.  
  * Seamless integration with the **Periodic Notes** plugin to find your data automatically.

## **How to Use**

The plugin has two core components: tracking habits inline in your periodic notes, and rendering that data in a code block.

### **Step 1: Setting Up Your Habits**

For the plugin to recognize a habit, you must create a dedicated note for it in a folder you specify in the settings.

1. **Create a "Habits" Folder:** Create a folder in your vault to store your habit notes (e.g., Habits/).  
2. **Set the Folder in Settings:** Go to Settings \-\> Easily Habit Tracker and set the "Habit folder" to the one you just created.  
3. **Create a Note for Each Habit:** Inside your "Habits" folder, create a new note for each habit you want to track (e.g., Read Book.md, Exercise.md).

#### **Customizing a Habit**

You can customize the appearance of each habit by adding properties (frontmatter) to its note.

**Example Read Book.md:**

```
---  
Habit_Color: "4a88c7"  
Completed_Icon_In_Calendar: "📚"  
Uncompleted_Icon_In_Calendar: "❌"  
---

This is my note for the "Read Book" habit.
```
### **Step 2: Tracking Habits in Periodic Notes**

In your daily, weekly, or monthly notes, you can now track your habits.

1. **Link to Your Habit:** On a new line, create a link to your habit note (e.g., \[\[Read Book\]\]).  
2. **Insert a Tracker:** With the cursor on the same line, open the command palette (Ctrl/Cmd \+ P) and search for "Habit:". Choose the tracker you want (e.g., Habit: Insert Habit: Number).  
3. A modal will pop up allowing you to configure the tracker. It will be inserted at your cursor.

Your final line will look something like this:

\[\[Read Book\]\]: {{number:10,50,pages,T:id123456789}}

This will render as an interactive number input in Live Preview and Reading mode.

### **Step 3: Visualizing with a Code Block**

To see your progress, you can add a habit-tracker code block to any note.

1. Open the command palette and run **"Habit: Insert Habit Tracker Block"**.  
2. A modal will appear, allowing you to configure the view.  
3. A code block will be inserted into your note, which will render into a visualization.

**Example Code Block:**
```
```habit-tracker
type: daily  
habits: ALL  
period: month 2025-07  
view: Calendar-Tight  
shape: circle  
habitsPerRow: 3  
useCustomizedColor: true
\```
```
#### **Code Block Settings**

| Key | Description | Example Values |
| :---- | :---- | :---- |
| type | The type of periodic note to find data in. | daily, weekly |
| habits | The habits to display. Use ALL for all habits in your folder, or a comma-separated list of links. | ALL, \[\[Read Book\]\], \[\[Exercise\]\] |
| period | The time period to display. Consists of a unit and a value. | month 2025-07, year 2025, week 2025-W30 |
| view | The style of the visualization. | Calendar-Tight, List-Row |
| shape | The default shape of the icons in the view. | circle, square |
| habitsPerRow | (For Calendar views) How many habit calendars to display side-by-side. | 1, 2, 3... |
| useCustomizedColor | If true, the view will use the Habit\_Color property from each habit's note. | true, false |

## **Settings**

The plugin's settings can be found in Settings \-\> Easily Habit Tracker. Here you can configure:

* The path to your **Habit Folder**.  
* The names of the **custom properties** the plugin looks for in your habit notes.  
* The **default icons** used for inline and block rendering.  
* The name of the **heading** in your periodic notes where the plugin should look for data.

## **Contributing**

Found a bug or have a feature request? Feel free to open an issue on the [GitHub repository](https://www.google.com/search?q=https://github.com/yodaliu0414/obsidian-easily-habit-tracker).
