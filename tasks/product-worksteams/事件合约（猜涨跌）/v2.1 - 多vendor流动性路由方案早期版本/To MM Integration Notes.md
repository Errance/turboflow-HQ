
From Tony (in Nayt Channel)
**Here is what our dev team suggested for the bidding system:**
Two market makers each submit quotes at a frequency of 1 quote per second to us.
Every two seconds, we will aggregate the quotes and pick the best price to show users. All trades within that 2-second window will be routed to the corresponding pool.
We will also push the winning price back to the market makers (every 2 seconds).