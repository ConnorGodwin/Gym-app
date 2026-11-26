/* Exercise library.
 * Format per line: Name | Category | Equipment | Type [| option=value ...]
 * Types:
 *   strength  – weight × reps
 *   bodyweight – reps (+ optional added weight)
 *   timed     – duration (+ optional weight)
 *   cardio    – distance + time (dist=km|m, pace=run|split|speed|swim)
 *   carry     – distance (m) + weight + time  (sleds, carries, lunges for distance)
 *   reps_time – reps + weight + time  (e.g. 100 wall balls for time)
 */
(function () {
  const RAW = `
Barbell Bench Press|Chest|Barbell|strength
Incline Barbell Bench Press|Chest|Barbell|strength
Decline Barbell Bench Press|Chest|Barbell|strength
Paused Bench Press|Chest|Barbell|strength
Barbell Floor Press|Chest|Barbell|strength
Spoto Press|Chest|Barbell|strength
Wide-Grip Bench Press|Chest|Barbell|strength
Dumbbell Bench Press|Chest|Dumbbell|strength
Incline Dumbbell Press|Chest|Dumbbell|strength
Decline Dumbbell Press|Chest|Dumbbell|strength
Single-Arm Dumbbell Bench Press|Chest|Dumbbell|strength
Dumbbell Floor Press|Chest|Dumbbell|strength
Dumbbell Squeeze Press|Chest|Dumbbell|strength
Dumbbell Fly|Chest|Dumbbell|strength
Incline Dumbbell Fly|Chest|Dumbbell|strength
Dumbbell Pullover|Chest|Dumbbell|strength
Chest Press Machine|Chest|Machine|strength
Incline Chest Press Machine|Chest|Machine|strength
Decline Chest Press Machine|Chest|Machine|strength
Plate-Loaded Chest Press|Chest|Machine|strength
Pec Deck|Chest|Machine|strength
Smith Machine Bench Press|Chest|Smith Machine|strength
Smith Machine Incline Press|Chest|Smith Machine|strength
Cable Crossover|Chest|Cable|strength
Low-to-High Cable Fly|Chest|Cable|strength
High-to-Low Cable Fly|Chest|Cable|strength
Single-Arm Cable Chest Press|Chest|Cable|strength
Seated Cable Fly|Chest|Cable|strength
Landmine Squeeze Press|Chest|Barbell|strength
Push-Up|Chest|Bodyweight|bodyweight
Incline Push-Up|Chest|Bodyweight|bodyweight
Decline Push-Up|Chest|Bodyweight|bodyweight
Wide Push-Up|Chest|Bodyweight|bodyweight
Archer Push-Up|Chest|Bodyweight|bodyweight
Clap Push-Up|Chest|Bodyweight|bodyweight
Deficit Push-Up|Chest|Bodyweight|bodyweight
Ring Push-Up|Chest|Bodyweight|bodyweight
Weighted Push-Up|Chest|Bodyweight|bodyweight
Chest Dip|Chest|Bodyweight|bodyweight
Band Chest Press|Chest|Band|strength
Conventional Deadlift|Back|Barbell|strength
Sumo Deadlift|Back|Barbell|strength
Trap Bar Deadlift|Back|Trap Bar|strength
Deficit Deadlift|Back|Barbell|strength
Rack Pull|Back|Barbell|strength
Paused Deadlift|Back|Barbell|strength
Snatch-Grip Deadlift|Back|Barbell|strength
Barbell Row|Back|Barbell|strength
Pendlay Row|Back|Barbell|strength
Underhand Barbell Row|Back|Barbell|strength
Yates Row|Back|Barbell|strength
T-Bar Row|Back|Barbell|strength
Seal Row|Back|Barbell|strength
Meadows Row|Back|Barbell|strength
Landmine Row|Back|Barbell|strength
Dumbbell Row|Back|Dumbbell|strength
Chest-Supported Dumbbell Row|Back|Dumbbell|strength
Kroc Row|Back|Dumbbell|strength
Renegade Row|Back|Dumbbell|strength
Kettlebell Row|Back|Kettlebell|strength
Gorilla Row|Back|Kettlebell|strength
Pull-Up|Back|Bodyweight|bodyweight
Chin-Up|Back|Bodyweight|bodyweight
Neutral-Grip Pull-Up|Back|Bodyweight|bodyweight
Wide-Grip Pull-Up|Back|Bodyweight|bodyweight
Weighted Pull-Up|Back|Bodyweight|bodyweight
Weighted Chin-Up|Back|Bodyweight|bodyweight
Assisted Pull-Up Machine|Back|Machine|strength
Band-Assisted Pull-Up|Back|Band|bodyweight
Negative Pull-Up|Back|Bodyweight|bodyweight
Inverted Row|Back|Bodyweight|bodyweight
Ring Row|Back|Bodyweight|bodyweight
Lat Pulldown|Back|Cable|strength
Close-Grip Lat Pulldown|Back|Cable|strength
Wide-Grip Lat Pulldown|Back|Cable|strength
Underhand Lat Pulldown|Back|Cable|strength
Single-Arm Lat Pulldown|Back|Cable|strength
Straight-Arm Pulldown|Back|Cable|strength
Seated Cable Row|Back|Cable|strength
Wide-Grip Cable Row|Back|Cable|strength
Single-Arm Cable Row|Back|Cable|strength
Machine Row|Back|Machine|strength
Chest-Supported Machine Row|Back|Machine|strength
Machine Lat Pulldown|Back|Machine|strength
Machine Pullover|Back|Machine|strength
Back Extension|Back|Bodyweight|bodyweight
Weighted Back Extension|Back|Machine|strength
Superman|Back|Bodyweight|bodyweight
Barbell Shrug|Back|Barbell|strength
Dumbbell Shrug|Back|Dumbbell|strength
Trap Bar Shrug|Back|Trap Bar|strength
Smith Machine Shrug|Back|Smith Machine|strength
Overhead Press|Shoulders|Barbell|strength
Seated Barbell Press|Shoulders|Barbell|strength
Behind-the-Neck Press|Shoulders|Barbell|strength
Z Press|Shoulders|Barbell|strength
Landmine Press|Shoulders|Barbell|strength
Single-Arm Landmine Press|Shoulders|Barbell|strength
Dumbbell Shoulder Press|Shoulders|Dumbbell|strength
Seated Dumbbell Shoulder Press|Shoulders|Dumbbell|strength
Arnold Press|Shoulders|Dumbbell|strength
Single-Arm Dumbbell Press|Shoulders|Dumbbell|strength
Machine Shoulder Press|Shoulders|Machine|strength
Smith Machine Shoulder Press|Shoulders|Smith Machine|strength
Kettlebell Press|Shoulders|Kettlebell|strength
Bottoms-Up Kettlebell Press|Shoulders|Kettlebell|strength
Dumbbell Lateral Raise|Shoulders|Dumbbell|strength
Seated Lateral Raise|Shoulders|Dumbbell|strength
Lean-Away Lateral Raise|Shoulders|Dumbbell|strength
Cable Lateral Raise|Shoulders|Cable|strength
Machine Lateral Raise|Shoulders|Machine|strength
Dumbbell Front Raise|Shoulders|Dumbbell|strength
Plate Front Raise|Shoulders|Other|strength
Cable Front Raise|Shoulders|Cable|strength
Rear Delt Dumbbell Fly|Shoulders|Dumbbell|strength
Reverse Pec Deck|Shoulders|Machine|strength
Cable Rear Delt Fly|Shoulders|Cable|strength
Barbell Upright Row|Shoulders|Barbell|strength
Cable Upright Row|Shoulders|Cable|strength
Face Pull|Shoulders|Cable|strength
Band Pull-Apart|Shoulders|Band|bodyweight
Y-Raise|Shoulders|Dumbbell|strength
Cuban Rotation|Shoulders|Dumbbell|strength
Cable External Rotation|Shoulders|Cable|strength
Kettlebell Halo|Shoulders|Kettlebell|strength
Pike Push-Up|Shoulders|Bodyweight|bodyweight
Handstand Push-Up|Shoulders|Bodyweight|bodyweight
Handstand Hold|Shoulders|Bodyweight|timed
Barbell Curl|Biceps|Barbell|strength
EZ-Bar Curl|Biceps|EZ Bar|strength
Dumbbell Curl|Biceps|Dumbbell|strength
Alternating Dumbbell Curl|Biceps|Dumbbell|strength
Hammer Curl|Biceps|Dumbbell|strength
Cross-Body Hammer Curl|Biceps|Dumbbell|strength
Incline Dumbbell Curl|Biceps|Dumbbell|strength
Concentration Curl|Biceps|Dumbbell|strength
Spider Curl|Biceps|Dumbbell|strength
Zottman Curl|Biceps|Dumbbell|strength
EZ-Bar Preacher Curl|Biceps|EZ Bar|strength
Dumbbell Preacher Curl|Biceps|Dumbbell|strength
Machine Preacher Curl|Biceps|Machine|strength
Machine Bicep Curl|Biceps|Machine|strength
Cable Curl|Biceps|Cable|strength
Rope Hammer Curl|Biceps|Cable|strength
Bayesian Cable Curl|Biceps|Cable|strength
High Cable Curl|Biceps|Cable|strength
Drag Curl|Biceps|Barbell|strength
21s Curl|Biceps|Barbell|strength
Band Curl|Biceps|Band|strength
Close-Grip Bench Press|Triceps|Barbell|strength
JM Press|Triceps|Barbell|strength
EZ-Bar Skull Crusher|Triceps|EZ Bar|strength
Dumbbell Skull Crusher|Triceps|Dumbbell|strength
Overhead Dumbbell Extension|Triceps|Dumbbell|strength
Single-Arm Overhead Extension|Triceps|Dumbbell|strength
Tate Press|Triceps|Dumbbell|strength
Dumbbell Kickback|Triceps|Dumbbell|strength
Rope Tricep Pushdown|Triceps|Cable|strength
Straight-Bar Pushdown|Triceps|Cable|strength
V-Bar Pushdown|Triceps|Cable|strength
Reverse-Grip Pushdown|Triceps|Cable|strength
Single-Arm Cable Pushdown|Triceps|Cable|strength
Overhead Cable Extension|Triceps|Cable|strength
Cable Kickback|Triceps|Cable|strength
Machine Tricep Extension|Triceps|Machine|strength
Machine Dip|Triceps|Machine|strength
Tricep Dip|Triceps|Bodyweight|bodyweight
Bench Dip|Triceps|Bodyweight|bodyweight
Diamond Push-Up|Triceps|Bodyweight|bodyweight
Wrist Curl|Forearms|Dumbbell|strength
Reverse Wrist Curl|Forearms|Dumbbell|strength
Barbell Wrist Curl|Forearms|Barbell|strength
Reverse Barbell Curl|Forearms|Barbell|strength
Wrist Roller|Forearms|Other|strength
Plate Pinch|Forearms|Other|timed
Dead Hang|Forearms|Bodyweight|timed
Grip Crusher|Forearms|Other|bodyweight
Back Squat|Quads|Barbell|strength
High-Bar Squat|Quads|Barbell|strength
Low-Bar Squat|Quads|Barbell|strength
Front Squat|Quads|Barbell|strength
Pause Squat|Quads|Barbell|strength
Box Squat|Quads|Barbell|strength
Safety Bar Squat|Quads|Barbell|strength
Zercher Squat|Quads|Barbell|strength
Anderson Squat|Quads|Barbell|strength
Goblet Squat|Quads|Dumbbell|strength
Heel-Elevated Goblet Squat|Quads|Dumbbell|strength
Dumbbell Squat|Quads|Dumbbell|strength
Kettlebell Front Squat|Quads|Kettlebell|strength
Hack Squat|Quads|Machine|strength
Pendulum Squat|Quads|Machine|strength
Belt Squat|Quads|Machine|strength
Leg Press|Quads|Machine|strength
Single-Leg Leg Press|Quads|Machine|strength
Smith Machine Squat|Quads|Smith Machine|strength
Leg Extension|Quads|Machine|strength
Single-Leg Extension|Quads|Machine|strength
Bulgarian Split Squat|Quads|Dumbbell|strength
Barbell Bulgarian Split Squat|Quads|Barbell|strength
Split Squat|Quads|Dumbbell|strength
Dumbbell Lunge|Quads|Dumbbell|strength
Dumbbell Walking Lunge|Quads|Dumbbell|strength
Barbell Lunge|Quads|Barbell|strength
Reverse Lunge|Quads|Dumbbell|strength
Lateral Lunge|Quads|Dumbbell|strength
Bodyweight Lunge|Quads|Bodyweight|bodyweight
Dumbbell Step-Up|Quads|Dumbbell|strength
Barbell Step-Up|Quads|Barbell|strength
Bodyweight Squat|Quads|Bodyweight|bodyweight
Jump Squat|Quads|Bodyweight|bodyweight
Pistol Squat|Quads|Bodyweight|bodyweight
Sissy Squat|Quads|Bodyweight|bodyweight
Cossack Squat|Quads|Bodyweight|bodyweight
Wall Sit|Quads|Bodyweight|timed
Spanish Squat|Quads|Band|bodyweight
Romanian Deadlift|Hamstrings|Barbell|strength
Stiff-Leg Deadlift|Hamstrings|Barbell|strength
Dumbbell Romanian Deadlift|Hamstrings|Dumbbell|strength
Single-Leg Romanian Deadlift|Hamstrings|Dumbbell|strength
Kettlebell Romanian Deadlift|Hamstrings|Kettlebell|strength
Good Morning|Hamstrings|Barbell|strength
Lying Leg Curl|Hamstrings|Machine|strength
Seated Leg Curl|Hamstrings|Machine|strength
Standing Single-Leg Curl|Hamstrings|Machine|strength
Nordic Hamstring Curl|Hamstrings|Bodyweight|bodyweight
Glute-Ham Raise|Hamstrings|Machine|bodyweight
Stability Ball Leg Curl|Hamstrings|Other|bodyweight
Slider Leg Curl|Hamstrings|Bodyweight|bodyweight
Cable Pull-Through|Glutes|Cable|strength
Barbell Hip Thrust|Glutes|Barbell|strength
Dumbbell Hip Thrust|Glutes|Dumbbell|strength
Machine Hip Thrust|Glutes|Machine|strength
Smith Machine Hip Thrust|Glutes|Smith Machine|strength
Single-Leg Hip Thrust|Glutes|Bodyweight|bodyweight
Barbell Glute Bridge|Glutes|Barbell|strength
Glute Bridge|Glutes|Bodyweight|bodyweight
Single-Leg Glute Bridge|Glutes|Bodyweight|bodyweight
Frog Pump|Glutes|Bodyweight|bodyweight
Cable Glute Kickback|Glutes|Cable|strength
Machine Glute Kickback|Glutes|Machine|strength
Hip Abduction Machine|Glutes|Machine|strength
Hip Adduction Machine|Glutes|Machine|strength
Cable Hip Abduction|Glutes|Cable|strength
Banded Lateral Walk|Glutes|Band|bodyweight
Banded Clamshell|Glutes|Band|bodyweight
Fire Hydrant|Glutes|Bodyweight|bodyweight
Curtsy Lunge|Glutes|Dumbbell|strength
Sumo Squat|Glutes|Dumbbell|strength
Reverse Hyperextension|Glutes|Machine|strength
Copenhagen Plank|Glutes|Bodyweight|timed
Standing Calf Raise|Calves|Machine|strength
Seated Calf Raise|Calves|Machine|strength
Smith Machine Calf Raise|Calves|Smith Machine|strength
Leg Press Calf Raise|Calves|Machine|strength
Dumbbell Calf Raise|Calves|Dumbbell|strength
Single-Leg Calf Raise|Calves|Bodyweight|bodyweight
Donkey Calf Raise|Calves|Machine|strength
Tibialis Raise|Calves|Other|bodyweight
Plank|Core|Bodyweight|timed
Side Plank|Core|Bodyweight|timed
Weighted Plank|Core|Other|timed
Hollow Body Hold|Core|Bodyweight|timed
L-Sit|Core|Bodyweight|timed
Hanging Leg Raise|Core|Bodyweight|bodyweight
Hanging Knee Raise|Core|Bodyweight|bodyweight
Toes-to-Bar|Core|Bodyweight|bodyweight
Captain's Chair Leg Raise|Core|Machine|bodyweight
Hanging Windshield Wiper|Core|Bodyweight|bodyweight
Lying Leg Raise|Core|Bodyweight|bodyweight
Reverse Crunch|Core|Bodyweight|bodyweight
Crunch|Core|Bodyweight|bodyweight
Bicycle Crunch|Core|Bodyweight|bodyweight
Sit-Up|Core|Bodyweight|bodyweight
Decline Sit-Up|Core|Bodyweight|bodyweight
GHD Sit-Up|Core|Machine|bodyweight
V-Up|Core|Bodyweight|bodyweight
Flutter Kicks|Core|Bodyweight|timed
Russian Twist|Core|Other|bodyweight
Dead Bug|Core|Bodyweight|bodyweight
Bird Dog|Core|Bodyweight|bodyweight
Mountain Climber|Core|Bodyweight|timed
Ab Wheel Rollout|Core|Other|bodyweight
Stir the Pot|Core|Other|bodyweight
Dragon Flag|Core|Bodyweight|bodyweight
Cable Crunch|Core|Cable|strength
Machine Crunch|Core|Machine|strength
Pallof Press|Core|Cable|strength
Cable Woodchopper|Core|Cable|strength
Landmine Rotation|Core|Barbell|strength
Suitcase Carry|Core|Dumbbell|carry
Kettlebell Swing|Full Body|Kettlebell|strength
American Kettlebell Swing|Full Body|Kettlebell|strength
Single-Arm Kettlebell Swing|Full Body|Kettlebell|strength
Kettlebell Clean|Full Body|Kettlebell|strength
Kettlebell Snatch|Full Body|Kettlebell|strength
Kettlebell Clean and Press|Full Body|Kettlebell|strength
Kettlebell Windmill|Full Body|Kettlebell|strength
Turkish Get-Up|Full Body|Kettlebell|strength
Barbell Thruster|Full Body|Barbell|strength
Dumbbell Thruster|Full Body|Dumbbell|strength
Landmine Thruster|Full Body|Barbell|strength
Dumbbell Clean and Press|Full Body|Dumbbell|strength
Devil Press|Full Body|Dumbbell|strength
Man Maker|Full Body|Dumbbell|strength
Dumbbell Snatch|Full Body|Dumbbell|strength
Burpee|Full Body|Bodyweight|bodyweight
Burpee Pull-Up|Full Body|Bodyweight|bodyweight
Box Jump|Full Body|Other|bodyweight
Broad Jump|Full Body|Bodyweight|bodyweight
Medicine Ball Slam|Full Body|Medicine Ball|strength
Medicine Ball Chest Pass|Full Body|Medicine Ball|strength
Rotational Med Ball Throw|Full Body|Medicine Ball|strength
Battle Ropes|Full Body|Other|timed
Jumping Jacks|Full Body|Bodyweight|timed
Jump Rope|Full Body|Other|timed
Double Unders|Full Body|Other|bodyweight
Bear Crawl|Full Body|Bodyweight|carry
Muscle-Up|Full Body|Bodyweight|bodyweight
Ring Muscle-Up|Full Body|Bodyweight|bodyweight
Rope Climb|Full Body|Other|bodyweight
Tire Flip|Full Body|Other|bodyweight
Sandbag Clean|Full Body|Sandbag|strength
Sandbag Over Shoulder|Full Body|Sandbag|strength
Farmer's Carry|Full Body|Dumbbell|carry
Trap Bar Carry|Full Body|Trap Bar|carry
Overhead Carry|Full Body|Kettlebell|carry
Yoke Carry|Full Body|Other|carry
Sandbag Bear Hug Carry|Full Body|Sandbag|carry
Prowler Push|Full Body|Sled|carry
Power Clean|Olympic|Barbell|strength
Hang Power Clean|Olympic|Barbell|strength
Hang Clean|Olympic|Barbell|strength
Squat Clean|Olympic|Barbell|strength
Clean and Jerk|Olympic|Barbell|strength
Push Press|Olympic|Barbell|strength
Push Jerk|Olympic|Barbell|strength
Split Jerk|Olympic|Barbell|strength
Snatch|Olympic|Barbell|strength
Power Snatch|Olympic|Barbell|strength
Hang Snatch|Olympic|Barbell|strength
Muscle Snatch|Olympic|Barbell|strength
Overhead Squat|Olympic|Barbell|strength
Snatch Balance|Olympic|Barbell|strength
Clean Pull|Olympic|Barbell|strength
Snatch Pull|Olympic|Barbell|strength
Clean High Pull|Olympic|Barbell|strength
Outdoor Run|Running|Bodyweight|cardio|dist=km|pace=run
Treadmill Run|Running|Machine|cardio|dist=km|pace=run
Easy Run|Running|Bodyweight|cardio|dist=km|pace=run
Recovery Run|Running|Bodyweight|cardio|dist=km|pace=run
Long Run|Running|Bodyweight|cardio|dist=km|pace=run
Tempo Run|Running|Bodyweight|cardio|dist=km|pace=run
Threshold Run|Running|Bodyweight|cardio|dist=km|pace=run
Progression Run|Running|Bodyweight|cardio|dist=km|pace=run
Fartlek|Running|Bodyweight|cardio|dist=km|pace=run
Trail Run|Running|Bodyweight|cardio|dist=km|pace=run
Parkrun 5K|Running|Bodyweight|cardio|dist=km|pace=run
200m Repeats|Running|Bodyweight|cardio|dist=m|pace=run
400m Repeats|Running|Bodyweight|cardio|dist=m|pace=run
800m Repeats|Running|Bodyweight|cardio|dist=m|pace=run
1km Repeats|Running|Bodyweight|cardio|dist=m|pace=run
Mile Repeats|Running|Bodyweight|cardio|dist=m|pace=run
Sprint|Running|Bodyweight|cardio|dist=m|pace=run
Hill Repeats|Running|Bodyweight|cardio|dist=m|pace=run
Strides|Running|Bodyweight|cardio|dist=m|pace=run
Treadmill Incline Walk|Running|Machine|cardio|dist=km|pace=run
Walk|Running|Bodyweight|cardio|dist=km|pace=run
Hike|Running|Bodyweight|cardio|dist=km|pace=run
Rucking|Running|Other|cardio|dist=km|pace=run
Outdoor Ride|Cycling|Bike|cardio|dist=km|pace=speed
Road Bike Ride|Cycling|Bike|cardio|dist=km|pace=speed
Mountain Bike Ride|Cycling|Bike|cardio|dist=km|pace=speed
Gravel Ride|Cycling|Bike|cardio|dist=km|pace=speed
Indoor Trainer Ride|Cycling|Bike|cardio|dist=km|pace=speed
Spin Class|Cycling|Bike|cardio|dist=km|pace=speed
Stationary Bike|Cycling|Machine|cardio|dist=km|pace=speed
Bike Intervals|Cycling|Bike|cardio|dist=km|pace=speed
Hill Climb Ride|Cycling|Bike|cardio|dist=km|pace=speed
Commute Ride|Cycling|Bike|cardio|dist=km|pace=speed
Assault Bike|Cycling|Machine|cardio|dist=m|pace=speed
BikeErg|Cycling|Erg|cardio|dist=m|pace=speed
Rowing Machine|Rowing & Erg|Erg|cardio|dist=m|pace=split
500m Row Repeats|Rowing & Erg|Erg|cardio|dist=m|pace=split
SkiErg|Rowing & Erg|Erg|cardio|dist=m|pace=split
Elliptical|Rowing & Erg|Machine|cardio|dist=km|pace=speed
Stair Climber|Rowing & Erg|Machine|timed
VersaClimber|Rowing & Erg|Machine|timed
Arc Trainer|Rowing & Erg|Machine|timed
Freestyle Swim|Swimming|Other|cardio|dist=m|pace=swim
Breaststroke|Swimming|Other|cardio|dist=m|pace=swim
Backstroke|Swimming|Other|cardio|dist=m|pace=swim
Butterfly|Swimming|Other|cardio|dist=m|pace=swim
Open Water Swim|Swimming|Other|cardio|dist=m|pace=swim
Swim Intervals|Swimming|Other|cardio|dist=m|pace=swim
Kickboard Drills|Swimming|Other|cardio|dist=m|pace=swim
HYROX Run (1km)|HYROX|Bodyweight|cardio|dist=m|pace=run
HYROX SkiErg (1000m)|HYROX|Erg|cardio|dist=m|pace=split
HYROX Sled Push (50m)|HYROX|Sled|carry
HYROX Sled Pull (50m)|HYROX|Sled|carry
HYROX Burpee Broad Jumps (80m)|HYROX|Bodyweight|cardio|dist=m|pace=run
HYROX Row (1000m)|HYROX|Erg|cardio|dist=m|pace=split
HYROX Farmers Carry (200m)|HYROX|Kettlebell|carry
HYROX Sandbag Lunges (100m)|HYROX|Sandbag|carry
HYROX Wall Balls (100 reps)|HYROX|Medicine Ball|reps_time
Wall Ball|HYROX|Medicine Ball|strength
Sled Push|HYROX|Sled|carry
Sled Pull|HYROX|Sled|carry
Sled Drag (Backwards)|HYROX|Sled|carry
Burpee Broad Jump|HYROX|Bodyweight|bodyweight
Sandbag Walking Lunge|HYROX|Sandbag|carry
Kettlebell Farmers Carry|HYROX|Kettlebell|carry
Compromised Run (after station)|HYROX|Bodyweight|cardio|dist=m|pace=run
Roxzone Transition Drill|HYROX|Bodyweight|timed
Burpees for Time|Conditioning|Bodyweight|reps_time
Wall Balls for Time|Conditioning|Medicine Ball|reps_time
Kettlebell Swings for Time|Conditioning|Kettlebell|reps_time
Thrusters for Time|Conditioning|Barbell|reps_time
Box Jump Overs|Conditioning|Other|reps_time
Shuttle Run|Conditioning|Bodyweight|cardio|dist=m|pace=run
EMOM Block|Conditioning|Other|timed
AMRAP Block|Conditioning|Other|timed
Tabata Block|Conditioning|Other|timed
Circuit Round|Conditioning|Other|timed
Hip Flexor Stretch|Mobility|Bodyweight|timed
Couch Stretch|Mobility|Bodyweight|timed
Hamstring Stretch|Mobility|Bodyweight|timed
Pigeon Pose|Mobility|Bodyweight|timed
Deep Squat Hold|Mobility|Bodyweight|timed
Child's Pose|Mobility|Bodyweight|timed
Downward Dog|Mobility|Bodyweight|timed
Doorway Chest Stretch|Mobility|Bodyweight|timed
Calf Stretch|Mobility|Bodyweight|timed
World's Greatest Stretch|Mobility|Bodyweight|bodyweight
Cat-Cow|Mobility|Bodyweight|bodyweight
90/90 Hip Switch|Mobility|Bodyweight|bodyweight
Thoracic Rotation|Mobility|Bodyweight|bodyweight
Band Shoulder Dislocate|Mobility|Band|bodyweight
Leg Swings|Mobility|Bodyweight|bodyweight
Foam Rolling|Mobility|Other|timed
Yoga Flow|Mobility|Bodyweight|timed
Football Match|Sports|Other|timed
Football Training|Sports|Other|timed
Rugby Training|Sports|Other|timed
Rugby Match|Sports|Other|timed
Basketball Game|Sports|Other|timed
Netball Game|Sports|Other|timed
Hockey Training|Sports|Other|timed
Cricket Nets|Sports|Other|timed
Volleyball|Sports|Other|timed
Tennis Match|Sports|Other|timed
Padel Match|Sports|Other|timed
Squash Match|Sports|Other|timed
Badminton|Sports|Other|timed
Golf Round|Sports|Other|timed
Climbing Session|Sports|Other|timed
Bouldering Session|Sports|Other|timed
Martial Arts Class|Sports|Other|timed
Dance Class|Sports|Other|timed
Skiing / Snowboarding|Sports|Other|timed
Surfing|Sports|Other|timed
Kayaking|Rowing & Erg|Other|cardio|dist=km|pace=speed
Stand-Up Paddleboarding|Rowing & Erg|Other|cardio|dist=km|pace=speed
Pull Buoy Swim|Swimming|Other|cardio|dist=m|pace=swim
Brick Run (off the bike)|Running|Bodyweight|cardio|dist=km|pace=run
Couch to 5K Run/Walk|Running|Bodyweight|timed
Brisk Walk|Running|Bodyweight|cardio|dist=km|pace=run
Shadow Boxing|Combat|Bodyweight|timed
Heavy Bag Rounds|Combat|Other|timed
Pad Work|Combat|Other|timed
Speed Bag|Combat|Other|timed
Sparring Rounds|Combat|Other|timed
Kicks on Bag|Combat|Other|timed
Grappling Drills|Combat|Other|timed
Sprawl|Combat|Bodyweight|bodyweight
Agility Ladder|Agility & Plyo|Other|timed
Cone Drill (5-10-5)|Agility & Plyo|Other|timed
Lateral Shuffle|Agility & Plyo|Bodyweight|timed
Reaction Ball Drill|Agility & Plyo|Other|timed
Skater Jump|Agility & Plyo|Bodyweight|bodyweight
Lateral Bound|Agility & Plyo|Bodyweight|bodyweight
Bounding|Agility & Plyo|Bodyweight|cardio|dist=m|pace=run
Tuck Jump|Agility & Plyo|Bodyweight|bodyweight
Depth Jump|Agility & Plyo|Other|bodyweight
Single-Leg Hop|Agility & Plyo|Bodyweight|bodyweight
Hurdle Hops|Agility & Plyo|Other|bodyweight
Vertical Jump|Agility & Plyo|Bodyweight|bodyweight
A-Skips|Agility & Plyo|Bodyweight|cardio|dist=m|pace=run
Hangboard Hang|Forearms|Other|timed
Lock-Off Hold|Back|Bodyweight|timed
Campus Board Ladders|Forearms|Other|bodyweight
Reverse Wrist Curl (Antagonist)|Forearms|Dumbbell|strength
Single-Leg Balance|Mobility|Bodyweight|timed
Heel-to-Toe Walk|Mobility|Bodyweight|timed
Sit-to-Stand|Quads|Bodyweight|bodyweight
Wall Push-Up|Chest|Bodyweight|bodyweight
Seated Marching|Core|Bodyweight|timed
Breathing / Meditation|Mobility|Other|timed
Neck Mobility|Mobility|Bodyweight|timed
Chin Tuck|Mobility|Bodyweight|bodyweight
Wall Angels|Mobility|Bodyweight|bodyweight
Glute Activation (Banded)|Glutes|Band|bodyweight
Ankle Mobility Drill|Mobility|Bodyweight|bodyweight
`;

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const list = RAW.trim().split('\n').map((line) => {
    const [name, category, equipment, type, ...opts] = line.split('|').map((s) => s.trim());
    const ex = { id: slug(name), name, category, equipment, type };
    opts.forEach((o) => { const [k, v] = o.split('='); ex[k] = v; });
    if (type === 'cardio') { ex.dist = ex.dist || 'km'; ex.pace = ex.pace || 'run'; }
    if (type === 'carry') ex.dist = 'm';
    return ex;
  });

  window.EXERCISES = list;
  window.EX_CATEGORIES = [...new Set(list.map((e) => e.category))];
  window.EX_EQUIPMENT = [...new Set(list.map((e) => e.equipment))].sort();
  window.slugify = slug;
})();
