use anchor_lang::prelude::*;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("5YiRmtvpJ4Fh1MQHEcWZCceGwQFLjn9cNqNgum9BScHx");

#[program]
mod journal {
    use super::*;

    pub fn create_journal_entry(
        ctx: Context<CreateEntry>,
        title: String,
        message: String,
    ) -> Result<()> {
        msg!("Geeting from Program ID: '{:?}'.",ctx.accounts.system_program.data);
        msg!("Journal Entry Created with Title: '{}', Message: '{}'.", title, message);

        let journal_entry = &mut ctx.accounts.journal_entry;
        journal_entry.owner = ctx.accounts.owner.key();     // *ctx.accounts.owner.key; de-reference
        journal_entry.title = title;
        journal_entry.message = message;
        Ok(())
        
    }

    pub fn update_journal_entry(
        ctx: Context<UpdateEntry>,
        _title: String,
        message: String,
    ) -> Result<()> {
        msg!("Journal Entry with title: '{}' is Updated with Message: '{}'.", _title, message);

        let journal_entry = &mut ctx.accounts.journal_entry;
        journal_entry.message = message;    // title cant be updated coz its part of PDA.

        Ok(())
    }

    pub fn delete_journal_entry(_ctx: Context<DeleteEntry>, _title: String) -> Result<()> {
        msg!("Journal entry titled '{}' deleted.", _title);
        //ctx.accounts.journal_entry.close(sol_destination)
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct JournalEntryState {      // #[derive(InitSpace)] not needed ?
    pub owner: Pubkey,
    #[max_len(50)]
    pub title: String,
    #[max_len(200)]
    pub message: String,
}

#[derive(Accounts)]
#[instruction(title: String)]             // title comes from user input arg    // #[message: String]
pub struct CreateEntry<'info> {     // instruction
    #[account(
        init,
        seeds = [title.as_bytes(), owner.key().as_ref()], // PDA is similar to DB Primary Key
        bump,                                             // if PDA just has owner, owner will be able to create single entry
        payer = owner, 
        space = 8 + JournalEntryState::INIT_SPACE        // 8 (Discrimator) + 32(PubKey) + 4 + title.len() + 4 + message.len()
    )]
    pub journal_entry: Account<'info, JournalEntryState>,   // journal_entry account for storing the JournalEntryState (owner,title,message)
    #[account(mut)]
    pub owner: Signer<'info>,                               // Owner is payer, hence mut coz owner state is being changed
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct UpdateEntry<'info> {
    #[account(
        mut,
        seeds = [title.as_bytes(), owner.key().as_ref()], 
        bump, 
        realloc = 8 + JournalEntryState::INIT_SPACE,         // 32 + 4 + title.len() + 4 + message.len(),
        realloc::payer = owner,                              // extra SOL
        realloc::zero = true, 
    )]
    pub journal_entry: Account<'info, JournalEntryState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct DeleteEntry<'info> {
    #[account( 
        mut, 
        seeds = [title.as_bytes(), owner.key().as_ref()], 
        bump, 
        close= owner,       // so that only the owner can close this journal_entry account
    )]
    pub journal_entry: Account<'info, JournalEntryState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
