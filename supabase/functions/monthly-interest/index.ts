import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  month?: string;
}

Deno.serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional month parameter
    let targetMonth: Date;
    if (req.method === "POST") {
      const body: RequestBody = await req.json();
      if (body.month) {
        targetMonth = new Date(body.month + "-01");
      } else {
        targetMonth = new Date();
      }
    } else {
      targetMonth = new Date();
    }

    // Calculate the previous month (interest is calculated for the previous month)
    const runMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() - 1,
      1,
    );

    console.log(
      `Running monthly interest calculation for: ${runMonth.toISOString().split("T")[0]}`,
    );

    // Call the stored procedure
    const { data, error } = await supabase.rpc("run_monthly_interest", {
      run_month: runMonth.toISOString().split("T")[0],
    });

    if (error) {
      console.error("Error running monthly interest:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to run monthly interest calculation",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("Monthly interest calculation completed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        message: `Monthly interest calculated for ${runMonth.toISOString().split("T")[0]}`,
        data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
